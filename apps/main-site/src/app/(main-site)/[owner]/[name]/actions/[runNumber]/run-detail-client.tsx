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
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { Link } from "@packages/ui/components/link";
import { useProjectionQueries } from "@packages/ui/rpc/projection-queries";
import { use, useMemo } from "react";

type WorkflowJob = {
	readonly githubJobId: number;
	readonly name: string;
	readonly status: string;
	readonly conclusion: string | null;
	readonly startedAt: number | null;
	readonly completedAt: number | null;
	readonly runnerName: string | null;
	readonly stepsJson: string | null;
};

type WorkflowRunDetail = {
	readonly repositoryId: number;
	readonly githubRunId: number;
	readonly workflowName: string | null;
	readonly runNumber: number;
	readonly runAttempt: number;
	readonly event: string;
	readonly status: string | null;
	readonly conclusion: string | null;
	readonly headBranch: string | null;
	readonly headSha: string;
	readonly actorLogin: string | null;
	readonly actorAvatarUrl: string | null;
	readonly htmlUrl: string | null;
	readonly createdAt: number;
	readonly updatedAt: number;
	readonly jobs: readonly WorkflowJob[];
} | null;

export function WorkflowRunDetailClient({
	owner,
	name,
	runNumber,
	initialDataPromise,
}: {
	owner: string;
	name: string;
	runNumber: number;
	initialDataPromise: Promise<WorkflowRunDetail>;
}) {
	const initialData = use(initialDataPromise);

	const client = useProjectionQueries();
	const detailAtom = useMemo(
		() =>
			client.getWorkflowRunDetail.subscription({
				ownerLogin: owner,
				name,
				runNumber,
			}),
		[client, owner, name, runNumber],
	);

	const run = useSubscriptionWithInitial(detailAtom, initialData);

	if (run === null) {
		return (
			<Card>
				<CardHeader>
					<CardDescription>Workflow run not found.</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<div>
			{/* Header */}
			<div className="flex items-start gap-3">
				<ConclusionIcon status={run.status} conclusion={run.conclusion} />
				<div>
					<h2 className="text-xl sm:text-2xl font-bold">
						{run.workflowName ?? "Workflow"}{" "}
						<span className="text-muted-foreground font-normal">
							#{run.runNumber}
						</span>
					</h2>
					<div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
						<ConclusionBadge status={run.status} conclusion={run.conclusion} />
						<Badge variant="outline" className="text-xs">
							{run.event}
						</Badge>
						{run.headBranch && <span>{run.headBranch}</span>}
						<span className="font-mono text-xs">{run.headSha.slice(0, 7)}</span>
						{run.runAttempt > 1 && <span>Attempt #{run.runAttempt}</span>}
					</div>
					<div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
						{run.actorLogin && (
							<span className="flex items-center gap-1">
								<Avatar className="size-5">
									<AvatarImage src={run.actorAvatarUrl ?? undefined} />
									<AvatarFallback className="text-[8px]">
										{run.actorLogin[0]?.toUpperCase()}
									</AvatarFallback>
								</Avatar>
								{run.actorLogin}
							</span>
						)}
						<span>Started {formatRelative(run.createdAt)}</span>
						{run.htmlUrl && (
							<Link
								href={run.htmlUrl}
								className="text-xs underline hover:text-foreground"
								target="_blank"
								rel="noopener noreferrer"
							>
								View on GitHub
							</Link>
						)}
					</div>
				</div>
			</div>

			{/* Jobs */}
			<div className="mt-6">
				<h3 className="text-lg font-semibold mb-3">Jobs ({run.jobs.length})</h3>
				{run.jobs.length === 0 ? (
					<Card>
						<CardHeader>
							<CardDescription>
								No jobs found for this workflow run.
							</CardDescription>
						</CardHeader>
					</Card>
				) : (
					<div className="space-y-3">
						{run.jobs.map((job) => (
							<JobCard key={job.githubJobId} job={job} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// --- Job card ---

function JobCard({ job }: { job: WorkflowJob }) {
	const steps = parseSteps(job.stepsJson);
	const duration = formatDuration(job.startedAt, job.completedAt);

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<ConclusionIcon status={job.status} conclusion={job.conclusion} />
					<CardTitle className="text-sm font-medium">{job.name}</CardTitle>
					<ConclusionBadge status={job.status} conclusion={job.conclusion} />
					{duration && (
						<span className="text-xs text-muted-foreground ml-auto">
							{duration}
						</span>
					)}
				</div>
				{job.runnerName && (
					<CardDescription className="text-xs">
						Runner: {job.runnerName}
					</CardDescription>
				)}
			</CardHeader>
			{steps.length > 0 && (
				<CardContent className="pt-0">
					<div className="space-y-1">
						{steps.map((step, i) => (
							<div
								key={`${step.name}-${i}`}
								className="flex items-center gap-2 text-xs"
							>
								<StepIcon conclusion={step.conclusion} />
								<span className="truncate">{step.name}</span>
								{step.conclusion && step.conclusion !== "success" && (
									<Badge variant="outline" className="text-[10px] ml-auto">
										{step.conclusion}
									</Badge>
								)}
							</div>
						))}
					</div>
				</CardContent>
			)}
		</Card>
	);
}

// --- Step parsing ---

type Step = {
	name: string;
	status: string;
	conclusion: string | null;
	number: number;
};

function parseSteps(stepsJson: string | null): readonly Step[] {
	if (!stepsJson) return [];
	try {
		const parsed: unknown = JSON.parse(stepsJson);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((s: unknown) => {
				if (typeof s !== "object" || s === null) return null;
				const step = s as Record<string, unknown>;
				const name = typeof step.name === "string" ? step.name : "Unknown step";
				const status =
					typeof step.status === "string" ? step.status : "unknown";
				const conclusion =
					typeof step.conclusion === "string" ? step.conclusion : null;
				const number = typeof step.number === "number" ? step.number : 0;
				return { name, status, conclusion, number };
			})
			.filter((s): s is Step => s !== null);
	} catch {
		return [];
	}
}

// --- Shared icons/badges ---

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
				className="size-5 text-yellow-500 animate-spin shrink-0"
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
				className="size-5 text-green-600 shrink-0"
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
				className="size-5 text-red-600 shrink-0"
				viewBox="0 0 16 16"
				fill="currentColor"
			>
				<path d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.75.75 0 0 0-1.06 1.06L6.94 8 4.97 9.97a.75.75 0 1 0 1.06 1.06L8 9.06l1.97 1.97a.75.75 0 1 0 1.06-1.06L9.06 8l1.97-1.97a.75.75 0 1 0-1.06-1.06L8 6.94 6.03 4.97Z" />
			</svg>
		);
	}
	return (
		<svg
			className="size-5 text-muted-foreground shrink-0"
			viewBox="0 0 16 16"
			fill="currentColor"
		>
			<path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16ZM4.5 7.25a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7Z" />
		</svg>
	);
}

function StepIcon({ conclusion }: { conclusion: string | null }) {
	if (conclusion === "success") {
		return (
			<svg
				className="size-3 text-green-600 shrink-0"
				viewBox="0 0 16 16"
				fill="currentColor"
			>
				<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
			</svg>
		);
	}
	if (conclusion === "failure") {
		return (
			<svg
				className="size-3 text-red-600 shrink-0"
				viewBox="0 0 16 16"
				fill="currentColor"
			>
				<path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
			</svg>
		);
	}
	return (
		<svg
			className="size-3 text-muted-foreground shrink-0"
			viewBox="0 0 16 16"
			fill="currentColor"
		>
			<path d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
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
			<Badge variant="secondary" className="text-xs text-yellow-600">
				In Progress
			</Badge>
		);
	}
	if (status === "queued") {
		return (
			<Badge variant="outline" className="text-xs">
				Queued
			</Badge>
		);
	}
	if (conclusion === "success") {
		return (
			<Badge variant="secondary" className="text-xs text-green-600">
				Success
			</Badge>
		);
	}
	if (conclusion === "failure") {
		return (
			<Badge variant="destructive" className="text-xs">
				Failed
			</Badge>
		);
	}
	if (conclusion === "cancelled") {
		return (
			<Badge variant="outline" className="text-xs">
				Cancelled
			</Badge>
		);
	}
	if (conclusion) {
		return (
			<Badge variant="outline" className="text-xs">
				{conclusion}
			</Badge>
		);
	}
	return null;
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

function formatDuration(
	startedAt: number | null,
	completedAt: number | null,
): string | null {
	if (startedAt === null || completedAt === null) return null;
	const durationMs = completedAt - startedAt;
	if (durationMs < 1000) return "<1s";
	const seconds = Math.floor(durationMs / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return `${hours}h ${remainingMinutes}m`;
}
