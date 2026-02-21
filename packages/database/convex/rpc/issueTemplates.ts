/**
 * Issue Templates — on-demand fetch + cache of GitHub issue templates.
 *
 * Templates live in `.github/ISSUE_TEMPLATE/` as `.md` files with YAML
 * front matter (name, description, title, labels, assignees).
 *
 * Flow:
 *   1. `fetchTemplates` (action) — lists the directory, fetches each `.md`
 *      file, parses YAML front matter, and caches results.
 *   2. `getCachedTemplates` (query) — reads cached templates for a repo.
 */
import { createRpcFactory, makeRpcModule } from "@packages/confect/rpc";
import { Effect, Option, Schema } from "effect";
import { api, internal } from "../_generated/api";
import {
	ConfectActionCtx,
	ConfectMutationCtx,
	ConfectQueryCtx,
	confectSchema,
} from "../confect";
import { ContentFile } from "../shared/generated_github_client";
import { GitHubApiClient } from "../shared/githubApi";
import { lookupGitHubTokenByUserIdConfect } from "../shared/githubToken";
import {
	resolveRepoAccess,
	verifyRepoPermissionForMutation,
} from "../shared/permissions";
import { DatabaseRpcTelemetryLayer } from "./telemetry";

const factory = createRpcFactory({ schema: confectSchema });

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const IssueTemplate = Schema.Struct({
	filename: Schema.String,
	name: Schema.String,
	description: Schema.String,
	title: Schema.NullOr(Schema.String),
	body: Schema.String,
	labels: Schema.Array(Schema.String),
	assignees: Schema.Array(Schema.String),
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class NotAuthenticated extends Schema.TaggedError<NotAuthenticated>()(
	"NotAuthenticated",
	{ reason: Schema.String },
) {}

class RepoNotFound extends Schema.TaggedError<RepoNotFound>()("RepoNotFound", {
	ownerLogin: Schema.String,
	name: Schema.String,
}) {}

// ---------------------------------------------------------------------------
// YAML front matter parser (minimal, no deps)
// ---------------------------------------------------------------------------

type FrontMatter = {
	name: string;
	description: string;
	title: string | null;
	labels: Array<string>;
	assignees: Array<string>;
};

/**
 * Parse YAML front matter from a markdown issue template.
 * Handles the subset of YAML used by GitHub issue templates.
 */
function parseFrontMatter(content: string): {
	frontMatter: FrontMatter;
	body: string;
} {
	const defaults: FrontMatter = {
		name: "",
		description: "",
		title: null,
		labels: [],
		assignees: [],
	};

	const match = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(content);
	if (!match || !match[1]) {
		return { frontMatter: defaults, body: content.trim() };
	}

	const yamlBlock = match[1];
	const body = content.slice(match[0].length).trim();
	const fm = { ...defaults };

	for (const line of yamlBlock.split("\n")) {
		const kvMatch = /^(\w+)\s*:\s*(.*)$/.exec(line);
		if (!kvMatch || !kvMatch[1] || kvMatch[2] === undefined) continue;

		const key = kvMatch[1];
		const rawValue = kvMatch[2].trim();

		if (key === "name") {
			fm.name = stripQuotes(rawValue);
		} else if (key === "description") {
			fm.description = stripQuotes(rawValue);
		} else if (key === "title") {
			fm.title = stripQuotes(rawValue) || null;
		} else if (key === "labels") {
			fm.labels = parseYamlArray(rawValue);
		} else if (key === "assignees") {
			fm.assignees = parseYamlArray(rawValue);
		}
	}

	return { frontMatter: fm, body };
}

function stripQuotes(s: string): string {
	if (
		(s.startsWith('"') && s.endsWith('"')) ||
		(s.startsWith("'") && s.endsWith("'"))
	) {
		return s.slice(1, -1);
	}
	return s;
}

/** Parse `[item1, item2]` or `item1, item2` style YAML arrays. */
function parseYamlArray(raw: string): Array<string> {
	const trimmed = raw.trim();
	if (trimmed.length === 0) return [];

	// Handle [item1, item2] format
	const bracketMatch = /^\[(.+)\]$/.exec(trimmed);
	const inner = bracketMatch?.[1] ?? trimmed;

	return inner
		.split(",")
		.map((s) => stripQuotes(s.trim()))
		.filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isContentFile = Schema.is(ContentFile);

const resolveViewerToken = (ctx: {
	auth: {
		getUserIdentity: () => Effect.Effect<Option.Option<{ subject: string }>>;
	};
	runQuery: ConfectActionCtx["runQuery"];
}) =>
	Effect.gen(function* () {
		const identity = yield* ctx.auth.getUserIdentity();
		if (Option.isNone(identity)) {
			return yield* new NotAuthenticated({
				reason: "User is not signed in",
			});
		}

		const token = yield* lookupGitHubTokenByUserIdConfect(
			ctx.runQuery,
			identity.value.subject,
		).pipe(
			Effect.catchTag(
				"NoGitHubTokenError",
				(e) => new NotAuthenticated({ reason: e.reason }),
			),
		);

		return token;
	});

// ---------------------------------------------------------------------------
// Endpoint definitions
// ---------------------------------------------------------------------------

/**
 * Fetch issue templates from GitHub and cache them.
 * Returns the parsed templates.
 */
const fetchTemplatesDef = factory.action({
	payload: {
		ownerLogin: Schema.String,
		name: Schema.String,
	},
	success: Schema.Array(IssueTemplate),
	error: Schema.Union(NotAuthenticated, RepoNotFound),
});

/**
 * Read cached templates for a repo (no GitHub API call).
 */
const getCachedTemplatesDef = factory.query({
	payload: {
		ownerLogin: Schema.String,
		name: Schema.String,
	},
	success: Schema.Array(IssueTemplate),
});

/**
 * Upsert template cache for a repo.
 */
const upsertTemplateCacheDef = factory.mutation({
	payload: {
		repositoryId: Schema.Number,
		templates: Schema.Array(IssueTemplate),
	},
	success: Schema.Struct({ cached: Schema.Boolean }),
});

// ---------------------------------------------------------------------------
// Implementations
// ---------------------------------------------------------------------------

fetchTemplatesDef.implement((args) =>
	Effect.gen(function* () {
		const ctx = yield* ConfectActionCtx;
		const token = yield* resolveViewerToken(ctx);

		const repositoryInfoResult = yield* ctx.runQuery(
			internal.rpc.codeBrowse.getRepoInfo,
			{ ownerLogin: args.ownerLogin, name: args.name },
		);
		const RepositoryInfoSchema = Schema.Struct({
			found: Schema.Boolean,
			repositoryId: Schema.optional(Schema.Number),
		});
		const repositoryInfo =
			Schema.decodeUnknownSync(RepositoryInfoSchema)(repositoryInfoResult);
		const repositoryId =
			repositoryInfo.found && repositoryInfo.repositoryId !== undefined
				? repositoryInfo.repositoryId
				: null;

		const gh = yield* Effect.provide(
			GitHubApiClient,
			GitHubApiClient.fromToken(token),
		);

		// List .github/ISSUE_TEMPLATE/ directory
		const dirContents = yield* gh.client
			.reposGetContent(args.ownerLogin, args.name, ".github/ISSUE_TEMPLATE", {})
			.pipe(Effect.catchAll(() => Effect.succeed(null)));

		if (dirContents === null || !Array.isArray(dirContents)) {
			// No templates directory — clear cache and return empty
			if (repositoryId !== null) {
				yield* ctx
					.runMutation(api.rpc.issueTemplates.upsertTemplateCache, {
						repositoryId,
						templates: [],
					})
					.pipe(Effect.catchAll(() => Effect.void));
			}
			return [] satisfies Array<typeof IssueTemplate.Type>;
		}

		// Filter to .md files only (skip .yml issue forms for now)
		const mdFiles = dirContents.filter(
			(entry) => entry.type === "file" && entry.name.endsWith(".md"),
		);

		// Fetch each template file
		const templates: Array<typeof IssueTemplate.Type> = [];

		for (const entry of mdFiles) {
			const fileResult = yield* gh.client
				.reposGetContent(args.ownerLogin, args.name, entry.path, {})
				.pipe(Effect.catchAll(() => Effect.succeed(null)));

			if (fileResult === null || !isContentFile(fileResult)) continue;

			const file = Schema.decodeUnknownSync(ContentFile)(fileResult);
			const rawContent = file.content;
			const encoding = file.encoding;

			let decoded: string | null = null;
			if (rawContent && encoding === "base64") {
				try {
					decoded = atob(rawContent.replace(/\n/g, ""));
				} catch {
					decoded = null;
				}
			} else if (rawContent) {
				decoded = rawContent;
			}

			if (decoded === null) continue;

			const { frontMatter, body } = parseFrontMatter(decoded);

			// Skip templates with no name (probably not a valid template)
			if (frontMatter.name.length === 0) continue;

			templates.push({
				filename: entry.name,
				name: frontMatter.name,
				description: frontMatter.description,
				title: frontMatter.title,
				body,
				labels: frontMatter.labels,
				assignees: frontMatter.assignees,
			});
		}

		// Cache results
		if (repositoryId !== null) {
			yield* ctx
				.runMutation(api.rpc.issueTemplates.upsertTemplateCache, {
					repositoryId,
					templates,
				})
				.pipe(Effect.catchAll(() => Effect.void));
		}

		return templates;
	}),
);

getCachedTemplatesDef.implement((args) =>
	Effect.gen(function* () {
		const ctx = yield* ConfectQueryCtx;
		const repo = yield* ctx.db
			.query("github_repositories")
			.withIndex("by_ownerLogin_and_name", (q) =>
				q.eq("ownerLogin", args.ownerLogin).eq("name", args.name),
			)
			.first();

		if (Option.isNone(repo)) {
			return [] satisfies Array<typeof IssueTemplate.Type>;
		}

		const access = yield* resolveRepoAccess(
			repo.value.githubRepoId,
			repo.value.private,
		).pipe(Effect.either);
		if (access._tag === "Left") {
			return [] satisfies Array<typeof IssueTemplate.Type>;
		}

		const cached = yield* ctx.db
			.query("github_issue_template_cache")
			.withIndex("by_repositoryId", (q) =>
				q.eq("repositoryId", repo.value.githubRepoId),
			)
			.collect();

		return cached.map((t) => ({
			filename: t.filename,
			name: t.name,
			description: t.description,
			title: t.title,
			body: t.body,
			labels: [...t.labels],
			assignees: [...t.assignees],
		}));
	}),
);

upsertTemplateCacheDef.implement((args) =>
	Effect.gen(function* () {
		const ctx = yield* ConfectMutationCtx;
		const identity = yield* ctx.auth.getUserIdentity();
		if (Option.isNone(identity)) {
			return { cached: false };
		}

		const repo = yield* ctx.db
			.query("github_repositories")
			.withIndex("by_githubRepoId", (q) =>
				q.eq("githubRepoId", args.repositoryId),
			)
			.first();
		if (Option.isNone(repo)) {
			return { cached: false };
		}

		const permission = yield* verifyRepoPermissionForMutation(
			identity.value.subject,
			args.repositoryId,
			"pull",
		).pipe(Effect.either);
		if (permission._tag === "Left") {
			return { cached: false };
		}

		const now = Date.now();

		// Delete existing templates for this repo
		const existing = yield* ctx.db
			.query("github_issue_template_cache")
			.withIndex("by_repositoryId", (q) =>
				q.eq("repositoryId", args.repositoryId),
			)
			.collect();

		for (const doc of existing) {
			yield* ctx.db.delete(doc._id);
		}

		// Insert new templates
		for (const template of args.templates) {
			yield* ctx.db.insert("github_issue_template_cache", {
				repositoryId: args.repositoryId,
				filename: template.filename,
				name: template.name,
				description: template.description,
				title: template.title,
				body: template.body,
				labels: [...template.labels],
				assignees: [...template.assignees],
				cachedAt: now,
			});
		}

		return { cached: true };
	}),
);

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

const issueTemplatesModule = makeRpcModule(
	{
		fetchTemplates: fetchTemplatesDef,
		getCachedTemplates: getCachedTemplatesDef,
		upsertTemplateCache: upsertTemplateCacheDef,
	},
	{ middlewares: DatabaseRpcTelemetryLayer },
);

export const { fetchTemplates, getCachedTemplates, upsertTemplateCache } =
	issueTemplatesModule.handlers;
export { issueTemplatesModule };
export type IssueTemplatesModule = typeof issueTemplatesModule;
