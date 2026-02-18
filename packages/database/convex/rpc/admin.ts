import { createRpcFactory, makeRpcModule } from "@packages/confect/rpc";
import { Effect, Schema } from "effect";
import { ConfectQueryCtx, confectSchema } from "../confect";
import { DatabaseRpcTelemetryLayer } from "./telemetry";

const factory = createRpcFactory({ schema: confectSchema });

const adminModule = makeRpcModule(
	{
		healthCheck: factory.query(
			{
				success: Schema.Struct({
					ok: Schema.Boolean,
					tableCount: Schema.Number,
				}),
			},
			() =>
				Effect.gen(function* () {
					const ctx = yield* ConfectQueryCtx;
					const repos = yield* ctx.db.query("github_repositories").take(1);
					return {
						ok: true,
						tableCount: repos.length,
					};
				}),
		),

		/** Diagnostic: counts of key tables for quick inspection */
		tableCounts: factory.query(
			{
				success: Schema.Struct({
					repositories: Schema.Number,
					branches: Schema.Number,
					pullRequests: Schema.Number,
					issues: Schema.Number,
					users: Schema.Number,
					syncJobs: Schema.Number,
					installations: Schema.Number,
					webhookEvents: Schema.Number,
				}),
			},
			() =>
				Effect.gen(function* () {
					const ctx = yield* ConfectQueryCtx;
					const repositories = yield* ctx.db
						.query("github_repositories")
						.collect();
					const branches = yield* ctx.db.query("github_branches").collect();
					const pullRequests = yield* ctx.db
						.query("github_pull_requests")
						.collect();
					const issues = yield* ctx.db.query("github_issues").collect();
					const users = yield* ctx.db.query("github_users").collect();
					const syncJobs = yield* ctx.db.query("github_sync_jobs").collect();
					const installations = yield* ctx.db
						.query("github_installations")
						.collect();
					const webhookEvents = yield* ctx.db
						.query("github_webhook_events_raw")
						.collect();
					return {
						repositories: repositories.length,
						branches: branches.length,
						pullRequests: pullRequests.length,
						issues: issues.length,
						users: users.length,
						syncJobs: syncJobs.length,
						installations: installations.length,
						webhookEvents: webhookEvents.length,
					};
				}),
		),
		/** Diagnostic: get sync job details */
		syncJobStatus: factory.query(
			{
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
			},
			() =>
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
		),
	},
	{ middlewares: DatabaseRpcTelemetryLayer },
);

export const { healthCheck, tableCounts, syncJobStatus } = adminModule.handlers;
export { adminModule };
export type AdminModule = typeof adminModule;
