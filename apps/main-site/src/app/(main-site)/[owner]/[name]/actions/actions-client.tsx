"use client";

import { useSubscriptionWithInitial } from "@packages/confect/rpc";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@packages/ui/components/avatar";
import { Badge } from "@packages/ui/components/badge";
import {
	Card,
	CardDescription,
	CardHeader,
} from "@packages/ui/components/card";
import { Link } from "@packages/ui/components/link";
import { useProjectionQueries } from "@packages/ui/rpc/projection-queries";
import { use, useMemo } from "react";

type WorkflowRunItem = {
	readonly githubRunId: number;
	readonly workflowName: string | null;
	readonly runNumber: number;
	readonly event: string;
	readonly status: string | null;
	readonly conclusion: string | null;
	readonly headBranch: string | null;
	readonly headSha: string;
	readonly actorLogin: string | null;
	readonly actorAvatarUrl: string | null;
	readonly jobCount: number;
	readonly htmlUrl: string | null;
	readonly createdAt: number;
	readonly updatedAt: number;
};

export function WorkflowRunListClient({
	owner,
	name,
	initialDataPromise,
}: {
	owner: string;
	name: string;
	initialDataPromise: Promise<readonly WorkflowRunItem[]>;
}) {
	const initialData = use(initialDataPromise);

	const client = useProjectionQueries();
	const runsAtom = useMemo(
		() =>
			client.listWorkflowRuns.subscription({
				ownerLogin: owner,
				name,
			}),
		[client, owner, name],
	);

	const runs = useSubscriptionWithInitial(runsAtom, initialData);

	return <WorkflowRunList owner={owner} name={name} runs={runs} />;
}

// --- Workflow run list (pure render, no loading states) ---

function WorkflowRunList({
	owner,
	name,
	runs,
}: {
	owner: string;
	name: string;
	runs: readonly WorkflowRunItem[];
}) {
	if (runs.length === 0) {
		return (
			<Card className="mt-4">
				<CardHeader>
					<CardDescription>
						No workflow runs found. Runs will appear here when GitHub Actions
						workflows execute.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<>
			<div className="mt-4 divide-y rounded-lg border">
				{runs.map((run) => (
					<Link
						key={run.githubRunId}
						href={`/${owner}/${name}/actions/${run.runNumber}`}
						className="flex items-start gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-muted/50 transition-colors"
					>
						<div className="mt-0.5 shrink-0">
							<ConclusionIcon status={run.status} conclusion={run.conclusion} />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
								<span className="font-medium text-sm sm:text-base break-words">
									{run.workflowName ?? "Workflow"}
								</span>
								<Badge variant="outline" className="text-xs shrink-0">
									#{run.runNumber}
								</Badge>
								<ConclusionBadge
									status={run.status}
									conclusion={run.conclusion}
								/>
							</div>
							<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-muted-foreground">
								{run.actorLogin && (
									<span className="flex items-center gap-1">
										<Avatar className="size-4">
											<AvatarImage src={run.actorAvatarUrl ?? undefined} />
											<AvatarFallback className="text-[8px]">
												{run.actorLogin[0]?.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										{run.actorLogin}
									</span>
								)}
								<Badge variant="outline" className="text-[10px] shrink-0">
									{run.event}
								</Badge>
								{run.headBranch && <span>{run.headBranch}</span>}
								<span>{formatRelative(run.createdAt)}</span>
								{run.jobCount > 0 && (
									<span>
										{run.jobCount} job{run.jobCount !== 1 ? "s" : ""}
									</span>
								)}
							</div>
						</div>
					</Link>
				))}
			</div>
			{runs.length >= 200 && (
				<p className="mt-2 text-center text-sm text-muted-foreground">
					Showing first 200 results
				</p>
			)}
		</>
	);
}

// --- Helpers ---

function formatRelative(timestamp: number): string {
	const diff = Math.floor((Date.now() - timestamp) / 1000);
	if (diff < 60) return "just now";
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
	return new Date(timestamp).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function ConclusionIcon({
	status,
	conclusion,
}: {
	status: string | null;
	conclusion: string | null;
}) {
	if (status === "in_progress" || status === "queued") {
		return (
			<svg
				className="size-4 text-yellow-500 animate-spin"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			>
				<circle cx="8" cy="8" r="6" strokeDasharray="20 10" />
			</svg>
		);
	}
	if (conclusion === "success") {
		return (
			<svg
				className="size-4 text-green-600"
				viewBox="0 0 16 16"
				fill="currentColor"
			>
				<path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
			</svg>
		);
	}
	if (conclusion === "failure") {
		return (
			<svg
				className="size-4 text-red-600"
				viewBox="0 0 16 16"
				fill="currentColor"
			>
				<path d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.75.75 0 0 0-1.06 1.06L6.94 8 4.97 9.97a.75.75 0 1 0 1.06 1.06L8 9.06l1.97 1.97a.75.75 0 1 0 1.06-1.06L9.06 8l1.97-1.97a.75.75 0 1 0-1.06-1.06L8 6.94 6.03 4.97Z" />
			</svg>
		);
	}
	if (conclusion === "cancelled" || conclusion === "skipped") {
		return (
			<svg
				className="size-4 text-muted-foreground"
				viewBox="0 0 16 16"
				fill="currentColor"
			>
				<path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16ZM4.5 7.25a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7Z" />
			</svg>
		);
	}
	// neutral or unknown
	return (
		<svg
			className="size-4 text-muted-foreground"
			viewBox="0 0 16 16"
			fill="currentColor"
		>
			<path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Z" />
		</svg>
	);
}

function ConclusionBadge({
	status,
	conclusion,
}: {
	status: string | null;
	conclusion: string | null;
}) {
	if (status === "in_progress") {
		return (
			<Badge variant="secondary" className="text-xs text-yellow-600 shrink-0">
				In Progress
			</Badge>
		);
	}
	if (status === "queued") {
		return (
			<Badge variant="outline" className="text-xs shrink-0">
				Queued
			</Badge>
		);
	}
	if (conclusion === "success") {
		return (
			<Badge variant="secondary" className="text-xs text-green-600 shrink-0">
				Success
			</Badge>
		);
	}
	if (conclusion === "failure") {
		return (
			<Badge variant="destructive" className="text-xs shrink-0">
				Failed
			</Badge>
		);
	}
	if (conclusion === "cancelled") {
		return (
			<Badge variant="outline" className="text-xs shrink-0">
				Cancelled
			</Badge>
		);
	}
	if (conclusion) {
		return (
			<Badge variant="outline" className="text-xs shrink-0">
				{conclusion}
			</Badge>
		);
	}
	return null;
}
