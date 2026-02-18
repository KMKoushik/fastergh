import { createRpcFactory, makeRpcModule } from "@packages/confect/rpc";
import { Effect, Schema } from "effect";
import { ConfectActionCtx, confectSchema } from "../confect";
import { GitHubApiClient } from "../shared/githubApi";
import { DatabaseRpcTelemetryLayer } from "./telemetry";

const factory = createRpcFactory({ schema: confectSchema });

// ---------------------------------------------------------------------------
// Endpoint definitions
// ---------------------------------------------------------------------------

/**
 * Fetch the unified diff for a pull request from the GitHub API.
 *
 * This is an action (not a query) because it makes an external HTTP call
 * to GitHub. The diff is returned as a raw string in unified diff format.
 */
const fetchPrDiffDef = factory.action({
	payload: {
		ownerLogin: Schema.String,
		name: Schema.String,
		number: Schema.Number,
	},
	success: Schema.NullOr(Schema.String),
});

// ---------------------------------------------------------------------------
// Implementations
// ---------------------------------------------------------------------------

fetchPrDiffDef.implement((args) =>
	Effect.gen(function* () {
		const github = yield* GitHubApiClient;
		const diff = yield* github.use(async (fetch) => {
			const res = await fetch(
				`/repos/${args.ownerLogin}/${args.name}/pulls/${args.number}`,
				{
					headers: { Accept: "application/vnd.github.diff" },
				},
			);
			if (res.status === 404) return null;
			if (!res.ok) {
				throw new Error(
					`GitHub API returned ${res.status}: ${await res.text()}`,
				);
			}
			return res.text();
		});
		return diff;
	}).pipe(
		Effect.catchAll(() => Effect.succeed(null)),
		Effect.provide(GitHubApiClient.Default),
	),
);

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

const githubActionsModule = makeRpcModule(
	{
		fetchPrDiff: fetchPrDiffDef,
	},
	{ middlewares: DatabaseRpcTelemetryLayer },
);

export const { fetchPrDiff } = githubActionsModule.handlers;
export { githubActionsModule };
export type GithubActionsModule = typeof githubActionsModule;
