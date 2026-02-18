import { createRpcFactory, makeRpcModule } from "@packages/confect/rpc";
import { Effect, Schema } from "effect";
import { ConfectQueryCtx, confectSchema } from "../confect";
import { DatabaseRpcTelemetryLayer } from "./telemetry";

const factory = createRpcFactory({ schema: confectSchema });

// ---------------------------------------------------------------------------
// Endpoint definitions (schema only — no handler bodies)
// ---------------------------------------------------------------------------

const healthCheckDef = factory.query({
	success: Schema.Struct({
		ok: Schema.Boolean,
		tableCount: Schema.Number,
	}),
});

const tableCountsDef = factory.query({
	success: Schema.Struct({
		repositories: Schema.Number,
		branches: Schema.Number,
		commits: Schema.Number,
		pullRequests: Schema.Number,
		pullRequestReviews: Schema.Number,
		issues: Schema.Number,
		issueComments: Schema.Number,
		checkRuns: Schema.Number,
		users: Schema.Number,
		syncJobs: Schema.Number,
		installations: Schema.Number,
		webhookEvents: Schema.Number,
	}),
});

const syncJobStatusDef = factory.query({
	success: Schema.Array(
		Schema.Struct({
			lockKey: Schema.String,
			state: Schema.String,
			attemptCount: Schema.Number,
			lastError: Schema.NullOr(Schema.String),
			jobType: Schema.String,
			triggerReason: Schema.String,
		}),
	),
});

// ---------------------------------------------------------------------------
// Implementations
// ---------------------------------------------------------------------------

healthCheckDef.implement(() =>
	Effect.gen(function* () {
		const ctx = yield* ConfectQueryCtx;
		const repos = yield* ctx.db.query("github_repositories").take(1);
		return {
			ok: true,
			tableCount: repos.length,
		};
	}),
);

tableCountsDef.implement(() =>
	Effect.gen(function* () {
		const ctx = yield* ConfectQueryCtx;
		const repositories = yield* ctx.db.query("github_repositories").collect();
		const branches = yield* ctx.db.query("github_branches").collect();
		const commits = yield* ctx.db.query("github_commits").collect();
		const pullRequests = yield* ctx.db.query("github_pull_requests").collect();
		const pullRequestReviews = yield* ctx.db
			.query("github_pull_request_reviews")
			.collect();
		const issues = yield* ctx.db.query("github_issues").collect();
		const issueComments = yield* ctx.db
			.query("github_issue_comments")
			.collect();
		const checkRuns = yield* ctx.db.query("github_check_runs").collect();
		const users = yield* ctx.db.query("github_users").collect();
		const syncJobs = yield* ctx.db.query("github_sync_jobs").collect();
		const installations = yield* ctx.db.query("github_installations").collect();
		const webhookEvents = yield* ctx.db
			.query("github_webhook_events_raw")
			.collect();
		return {
			repositories: repositories.length,
			branches: branches.length,
			commits: commits.length,
			pullRequests: pullRequests.length,
			pullRequestReviews: pullRequestReviews.length,
			issues: issues.length,
			issueComments: issueComments.length,
			checkRuns: checkRuns.length,
			users: users.length,
			syncJobs: syncJobs.length,
			installations: installations.length,
			webhookEvents: webhookEvents.length,
		};
	}),
);

syncJobStatusDef.implement(() =>
	Effect.gen(function* () {
		const ctx = yield* ConfectQueryCtx;
		const jobs = yield* ctx.db.query("github_sync_jobs").collect();
		return jobs.map((j) => ({
			lockKey: j.lockKey,
			state: j.state,
			attemptCount: j.attemptCount,
			lastError: j.lastError,
			jobType: j.jobType,
			triggerReason: j.triggerReason,
		}));
	}),
);

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

const adminModule = makeRpcModule(
	{
		healthCheck: healthCheckDef,
		tableCounts: tableCountsDef,
		syncJobStatus: syncJobStatusDef,
	},
	{ middlewares: DatabaseRpcTelemetryLayer },
);

export const { healthCheck, tableCounts, syncJobStatus } = adminModule.handlers;
export { adminModule };
export type AdminModule = typeof adminModule;
