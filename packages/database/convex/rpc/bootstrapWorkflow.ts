/**
 * bootstrapWorkflow — Durable workflow for initial repository sync.
 *
 * Orchestrates the individual fetch step-actions defined in `bootstrapSteps.ts`
 * using the Convex Workflow component for durable execution. If any step fails
 * (e.g. due to a GitHub rate limit), it is retried with exponential backoff.
 * Steps that already completed are NOT re-run on retry.
 *
 * The workflow also manages the sync job lifecycle (pending → running → done/failed).
 */
import { vWorkflowId } from "@convex-dev/workflow";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { workflow } from "../shared/workflow";

// ---------------------------------------------------------------------------
// Workflow definition
// ---------------------------------------------------------------------------

export const bootstrapRepo = workflow.define({
	args: {
		repositoryId: v.number(),
		fullName: v.string(),
		lockKey: v.string(),
	},
	handler: async (step, args): Promise<void> => {
		const s = internal.rpc.bootstrapSteps;

		// Mark job as running
		await step.runMutation(internal.rpc.bootstrapWorkflow.markSyncJob, {
			lockKey: args.lockKey,
			state: "running",
			lastError: null,
		});

		// Step 1: Fetch branches
		await step.runAction(
			s.fetchBranches,
			{
				repositoryId: args.repositoryId,
				fullName: args.fullName,
			},
			{ name: "fetch-branches" },
		);

		// Step 2: Fetch pull requests (paginated)
		const prResult = await step.runAction(
			s.fetchPullRequests,
			{
				repositoryId: args.repositoryId,
				fullName: args.fullName,
			},
			{ name: "fetch-pull-requests" },
		);

		// Step 3: Fetch issues (paginated)
		await step.runAction(
			s.fetchIssues,
			{
				repositoryId: args.repositoryId,
				fullName: args.fullName,
			},
			{ name: "fetch-issues" },
		);

		// Step 4: Fetch recent commits
		await step.runAction(
			s.fetchCommits,
			{
				repositoryId: args.repositoryId,
				fullName: args.fullName,
			},
			{ name: "fetch-commits" },
		);

		// Step 5: Fetch check runs for active PR head SHAs
		const activePrHeadShas = prResult.openPrSyncTargets.map((t) => t.headSha);
		// Deduplicate SHAs
		const uniqueShas = [...new Set(activePrHeadShas)];

		if (uniqueShas.length > 0) {
			await step.runAction(
				s.fetchCheckRuns,
				{
					repositoryId: args.repositoryId,
					fullName: args.fullName,
					headShas: uniqueShas,
				},
				{ name: "fetch-check-runs" },
			);
		}

		// Step 6: Fetch workflow runs + jobs
		await step.runAction(
			s.fetchWorkflowRuns,
			{
				repositoryId: args.repositoryId,
				fullName: args.fullName,
			},
			{ name: "fetch-workflow-runs" },
		);

		// Step 7: Schedule PR file syncs for open PRs
		if (prResult.openPrSyncTargets.length > 0) {
			await step.runAction(
				s.schedulePrFileSyncs,
				{
					repositoryId: args.repositoryId,
					fullName: args.fullName,
					openPrSyncTargets: prResult.openPrSyncTargets,
				},
				{ name: "schedule-pr-file-syncs" },
			);
		}

		// Mark job as done
		await step.runMutation(internal.rpc.bootstrapWorkflow.markSyncJob, {
			lockKey: args.lockKey,
			state: "done",
			lastError: null,
		});
	},
});

// ---------------------------------------------------------------------------
// startBootstrap — Called from Confect mutations to kick off the workflow.
//
// This is a vanilla Convex internalMutation so it has access to the raw
// MutationCtx needed by `workflow.start()`.
// ---------------------------------------------------------------------------

export const startBootstrap = internalMutation({
	args: {
		repositoryId: v.number(),
		fullName: v.string(),
		lockKey: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		await workflow.start(
			ctx,
			internal.rpc.bootstrapWorkflow.bootstrapRepo,
			{
				repositoryId: args.repositoryId,
				fullName: args.fullName,
				lockKey: args.lockKey,
			},
			{
				onComplete: internal.rpc.bootstrapWorkflow.onBootstrapComplete,
				context: { lockKey: args.lockKey },
			},
		);
		return null;
	},
});

// ---------------------------------------------------------------------------
// onBootstrapComplete — Called by the workflow engine when the workflow
// finishes (success, failure, or cancellation).
//
// On failure, marks the sync job as failed so the UI can surface the error.
// ---------------------------------------------------------------------------

export const onBootstrapComplete = internalMutation({
	args: {
		workflowId: vWorkflowId,
		result: v.any(),
		context: v.any(),
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const lockKey =
			args.context &&
			typeof args.context === "object" &&
			"lockKey" in args.context
				? String(args.context.lockKey)
				: null;

		if (!lockKey) return null;

		const result =
			args.result && typeof args.result === "object" && "kind" in args.result
				? args.result
				: null;

		if (!result) return null;

		// Only handle failure/cancellation — success is marked inside the workflow
		if (result.kind === "error" || result.kind === "canceled") {
			const errorMessage =
				result.kind === "error"
					? String(result.error ?? "Unknown workflow error")
					: "Workflow canceled";

			const job = await ctx.db
				.query("github_sync_jobs")
				.withIndex("by_lockKey", (q) => q.eq("lockKey", lockKey))
				.first();

			if (job) {
				await ctx.db.patch(job._id, {
					state: "failed",
					lastError: errorMessage,
					updatedAt: Date.now(),
				});
			}
		}

		return null;
	},
});

// ---------------------------------------------------------------------------
// Helper mutation: update sync job state
//
// This is a thin wrapper that the workflow calls via step.runMutation().
// ---------------------------------------------------------------------------

export const markSyncJob = internalMutation({
	args: {
		lockKey: v.string(),
		state: v.union(
			v.literal("pending"),
			v.literal("running"),
			v.literal("retry"),
			v.literal("done"),
			v.literal("failed"),
		),
		lastError: v.union(v.string(), v.null()),
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		// Find the sync job by lockKey
		const job = await ctx.db
			.query("github_sync_jobs")
			.withIndex("by_lockKey", (q) => q.eq("lockKey", args.lockKey))
			.first();

		if (!job) return null;

		await ctx.db.patch(job._id, {
			state: args.state,
			lastError: args.lastError,
			attemptCount: job.attemptCount + 1,
			updatedAt: Date.now(),
		});

		return null;
	},
});
