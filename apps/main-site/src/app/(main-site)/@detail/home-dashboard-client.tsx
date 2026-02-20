"use client";

import { Result, useAtomValue } from "@effect-atom/atom-react";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@packages/ui/components/avatar";
import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import { Link } from "@packages/ui/components/link";
import { Skeleton } from "@packages/ui/components/skeleton";
import { GitHubIcon } from "@packages/ui/icons/index";
import { authClient } from "@packages/ui/lib/auth-client";
import { cn } from "@packages/ui/lib/utils";
import { useProjectionQueries } from "@packages/ui/rpc/projection-queries";
import { Option } from "effect";
import {
	Activity,
	ArrowRight,
	CircleDot,
	Eye,
	GitBranch,
	GitMerge,
	GitPullRequest,
	MessageCircle,
	Rocket,
	TriangleAlert,
	User,
} from "lucide-react";
import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const EmptyPayload: Record<string, never> = {};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HomeDashboard() {
	const session = authClient.useSession();
	const client = useProjectionQueries();
	const dashboardAtom = useMemo(
		() => client.getHomeDashboard.subscription(EmptyPayload),
		[client],
	);
	const dashboardResult = useAtomValue(dashboardAtom);

	if (session.isPending || Result.isInitial(dashboardResult)) {
		return <DashboardSkeleton />;
	}

	const valueOption = Result.value(dashboardResult);
	if (Option.isNone(valueOption)) return <DashboardSkeleton />;

	const {
		githubLogin,
		yourPrs,
		needsAttentionPrs,
		recentPrs,
		recentActivity,
		repos,
	} = valueOption.value;

	const isSignedIn = session.data !== null;

	// Aggregate stats across all repos
	const totalOpenPrs = repos.reduce((sum, r) => sum + r.openPrCount, 0);
	const totalOpenIssues = repos.reduce((sum, r) => sum + r.openIssueCount, 0);
	const totalFailing = repos.reduce((sum, r) => sum + r.failingCheckCount, 0);

	return (
		<div className="h-full overflow-y-auto">
			<div className="mx-auto max-w-2xl px-6 py-8">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-2 mb-1">
						<Rocket className="size-4 text-muted-foreground" />
						<h1 className="text-lg font-bold tracking-tight text-foreground">
							{githubLogin
								? `Hey, ${githubLogin}`
								: isSignedIn
									? "Launch Pad"
									: "QuickHub"}
						</h1>
					</div>
					<p className="text-xs text-muted-foreground">
						{!isSignedIn
							? "A real-time GitHub dashboard — sign in to personalize"
							: repos.length === 0
								? "Get started by adding a repository"
								: `Your overview across ${repos.length} ${repos.length === 1 ? "repository" : "repositories"}`}
					</p>
				</div>

				{/* Sign-in banner for unauthenticated users */}
				{!isSignedIn && (
					<div className="mb-8 rounded-lg border border-border/60 bg-muted/30 px-4 py-4">
						<div className="flex items-start gap-3">
							<div className="size-9 rounded-full bg-foreground/5 flex items-center justify-center shrink-0">
								<GitHubIcon className="size-4 text-foreground/70" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-xs font-semibold text-foreground mb-0.5">
									Sign in to personalize your dashboard
								</p>
								<p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
									See your open PRs, track CI status, and jump straight into
									what matters. Connect your GitHub account to get started.
								</p>
								<Button
									size="sm"
									className="h-7 text-xs gap-1.5"
									onClick={() => {
										authClient.signIn.social({ provider: "github" });
									}}
								>
									<GitHubIcon className="size-3.5" />
									Sign in with GitHub
								</Button>
							</div>
						</div>
					</div>
				)}

				{/* Aggregate stats */}
				{repos.length > 0 && (
					<div className="grid grid-cols-3 gap-3 mb-8">
						<div className="rounded-lg border px-3 py-2.5">
							<div className="flex items-center gap-1.5 mb-1">
								<GitPullRequest className="size-3 text-green-500" />
								<span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
									Open PRs
								</span>
							</div>
							<p className="text-xl font-bold tabular-nums text-foreground">
								{totalOpenPrs}
							</p>
						</div>
						<div className="rounded-lg border px-3 py-2.5">
							<div className="flex items-center gap-1.5 mb-1">
								<CircleDot className="size-3 text-blue-500" />
								<span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
									Open Issues
								</span>
							</div>
							<p className="text-xl font-bold tabular-nums text-foreground">
								{totalOpenIssues}
							</p>
						</div>
						<div
							className={cn(
								"rounded-lg border px-3 py-2.5",
								totalFailing > 0 && "border-red-500/20 bg-red-500/[0.02]",
							)}
						>
							<div className="flex items-center gap-1.5 mb-1">
								<TriangleAlert
									className={cn(
										"size-3",
										totalFailing > 0 ? "text-red-500" : "text-muted-foreground",
									)}
								/>
								<span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
									Failing
								</span>
							</div>
							<p
								className={cn(
									"text-xl font-bold tabular-nums",
									totalFailing > 0 ? "text-red-500" : "text-foreground",
								)}
							>
								{totalFailing}
							</p>
						</div>
					</div>
				)}

				{/* Your open PRs — only shown when signed in */}
				{yourPrs.length > 0 && (
					<section className="mb-8">
						<div className="flex items-center gap-1.5 mb-2">
							<User className="size-3.5 text-green-500" />
							<h2 className="text-xs font-semibold text-foreground">
								Your Open Pull Requests
							</h2>
							<span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
								{yourPrs.length}
							</span>
						</div>
						<PrList prs={yourPrs} />
					</section>
				)}

				{/* Needs your attention — PRs where user is reviewer or assignee */}
				{needsAttentionPrs.length > 0 && (
					<section className="mb-8">
						<div className="flex items-center gap-1.5 mb-2">
							<Eye className="size-3.5 text-yellow-500" />
							<h2 className="text-xs font-semibold text-foreground">
								Needs Your Attention
							</h2>
							<span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
								{needsAttentionPrs.length}
							</span>
						</div>
						<PrList prs={needsAttentionPrs} />
					</section>
				)}

				{/* Recent PRs across all repos */}
				{recentPrs.length > 0 && (
					<section className="mb-8">
						<div className="flex items-center gap-1.5 mb-2">
							<GitPullRequest className="size-3.5 text-green-500" />
							<h2 className="text-xs font-semibold text-foreground">
								{yourPrs.length > 0 || needsAttentionPrs.length > 0
									? "Other Open Pull Requests"
									: "Open Pull Requests"}
							</h2>
						</div>
						<PrList prs={recentPrs} />
					</section>
				)}

				{/* Recent Activity */}
				{recentActivity.length > 0 && (
					<section className="mb-8">
						<div className="flex items-center gap-1.5 mb-2">
							<Activity className="size-3.5 text-blue-500" />
							<h2 className="text-xs font-semibold text-foreground">
								Recent Activity
							</h2>
						</div>
						<div className="divide-y rounded-lg border">
							{recentActivity.map((activity, i) => (
								<ActivityRow
									key={`${activity.ownerLogin}/${activity.repoName}-${activity.createdAt}-${i}`}
									activity={activity}
								/>
							))}
						</div>
					</section>
				)}

				{/* Quick-access repo grid */}
				{repos.length > 0 && (
					<section>
						<div className="flex items-center gap-1.5 mb-2">
							<GitBranch className="size-3.5 text-muted-foreground" />
							<h2 className="text-xs font-semibold text-foreground">
								Repositories
							</h2>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{repos.map((repo) => (
								<Link
									key={repo.fullName}
									href={`/${repo.ownerLogin}/${repo.name}/pulls`}
									className="flex flex-col gap-1 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted no-underline group"
								>
									<div className="flex items-center gap-1.5">
										<span className="font-semibold text-xs text-foreground truncate">
											{repo.name}
										</span>
										<ArrowRight className="size-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors ml-auto shrink-0" />
									</div>
									<span className="text-[10px] text-muted-foreground truncate">
										{repo.ownerLogin}
									</span>
									<div className="flex items-center gap-2 text-[10px] tabular-nums text-muted-foreground mt-0.5">
										<span className="flex items-center gap-0.5">
											<GitPullRequest className="size-2.5 text-green-500" />
											{repo.openPrCount}
										</span>
										<span className="flex items-center gap-0.5">
											<CircleDot className="size-2.5 text-blue-500" />
											{repo.openIssueCount}
										</span>
										{repo.failingCheckCount > 0 && (
											<span className="flex items-center gap-0.5 text-red-500 font-medium">
												<TriangleAlert className="size-2.5" />
												{repo.failingCheckCount}
											</span>
										)}
										{repo.lastPushAt && (
											<span className="ml-auto text-muted-foreground/70">
												{formatRelative(repo.lastPushAt)}
											</span>
										)}
									</div>
								</Link>
							))}
						</div>
					</section>
				)}

				{/* Empty state — only for signed-in users with no repos */}
				{isSignedIn && repos.length === 0 && (
					<div className="text-center py-16">
						<div className="mx-auto size-12 rounded-full bg-muted/40 flex items-center justify-center">
							<Rocket className="size-5 text-muted-foreground/30" />
						</div>
						<p className="mt-3 text-xs font-medium text-muted-foreground">
							No repositories connected yet
						</p>
						<p className="mt-1 text-[11px] text-muted-foreground/70">
							Add a repository from the sidebar to get started
						</p>
					</div>
				)}

				{/* Empty state for signed-out with no data */}
				{!isSignedIn &&
					repos.length === 0 &&
					recentPrs.length === 0 &&
					recentActivity.length === 0 && (
						<div className="text-center py-16">
							<div className="mx-auto size-12 rounded-full bg-muted/40 flex items-center justify-center">
								<Rocket className="size-5 text-muted-foreground/30" />
							</div>
							<p className="mt-3 text-xs font-medium text-muted-foreground">
								Nothing to show yet
							</p>
							<p className="mt-1 text-[11px] text-muted-foreground/70 max-w-[240px] mx-auto">
								Sign in with GitHub to connect your repositories and see your
								personalized dashboard
							</p>
						</div>
					)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// PR list
// ---------------------------------------------------------------------------

type PrItem = {
	ownerLogin: string;
	repoName: string;
	number: number;
	state: "open" | "closed";
	draft: boolean;
	title: string;
	authorLogin: string | null;
	authorAvatarUrl: string | null;
	commentCount: number;
	lastCheckConclusion: string | null;
	githubUpdatedAt: number;
};

function PrList({ prs }: { prs: ReadonlyArray<PrItem> }) {
	return (
		<div className="divide-y rounded-lg border">
			{prs.map((pr) => (
				<Link
					key={`${pr.ownerLogin}/${pr.repoName}#${pr.number}`}
					href={`/${pr.ownerLogin}/${pr.repoName}/pulls/${pr.number}`}
					className="flex items-start gap-2.5 px-3 py-2 transition-colors hover:bg-muted no-underline"
				>
					<PrStateIcon state={pr.state} draft={pr.draft} />
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5">
							<span className="font-medium text-xs truncate text-foreground">
								{pr.title}
							</span>
							{pr.draft && (
								<Badge
									variant="outline"
									className="text-[9px] px-1 py-0 shrink-0"
								>
									Draft
								</Badge>
							)}
						</div>
						<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
							<span className="font-medium text-muted-foreground/80">
								{pr.ownerLogin}/{pr.repoName}
							</span>
							<span className="text-muted-foreground/40">&middot;</span>
							<span>#{pr.number}</span>
							{pr.authorLogin && (
								<>
									<span className="text-muted-foreground/40">&middot;</span>
									<span className="flex items-center gap-1">
										{pr.authorAvatarUrl && (
											<Avatar className="size-3">
												<AvatarImage
													src={pr.authorAvatarUrl}
													alt={pr.authorLogin}
												/>
												<AvatarFallback className="text-[6px]">
													{pr.authorLogin[0]?.toUpperCase()}
												</AvatarFallback>
											</Avatar>
										)}
										{pr.authorLogin}
									</span>
								</>
							)}
							<span>{formatRelative(pr.githubUpdatedAt)}</span>
							{pr.commentCount > 0 && (
								<span className="flex items-center gap-0.5">
									<MessageCircle className="size-2.5" />
									{pr.commentCount}
								</span>
							)}
						</div>
					</div>
					{pr.lastCheckConclusion && (
						<CheckDot conclusion={pr.lastCheckConclusion} />
					)}
				</Link>
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Activity row
// ---------------------------------------------------------------------------

function ActivityRow({
	activity,
}: {
	activity: {
		ownerLogin: string;
		repoName: string;
		activityType: string;
		title: string;
		description: string | null;
		actorLogin: string | null;
		actorAvatarUrl: string | null;
		entityNumber: number | null;
		createdAt: number;
	};
}) {
	const href = (() => {
		const base = `/${activity.ownerLogin}/${activity.repoName}`;
		if (activity.entityNumber === null) return base;
		if (
			activity.activityType === "pr_opened" ||
			activity.activityType === "pr_closed" ||
			activity.activityType === "pr_merged" ||
			activity.activityType === "pr_review"
		) {
			return `${base}/pulls/${activity.entityNumber}`;
		}
		if (
			activity.activityType === "issue_opened" ||
			activity.activityType === "issue_closed"
		) {
			return `${base}/issues/${activity.entityNumber}`;
		}
		return base;
	})();

	return (
		<Link
			href={href}
			className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-muted no-underline"
		>
			{activity.actorAvatarUrl ? (
				<Avatar className="size-5">
					<AvatarImage
						src={activity.actorAvatarUrl}
						alt={activity.actorLogin ?? ""}
					/>
					<AvatarFallback className="text-[8px]">
						{activity.actorLogin?.[0]?.toUpperCase() ?? "?"}
					</AvatarFallback>
				</Avatar>
			) : (
				<div className="size-5 rounded-full bg-muted flex items-center justify-center shrink-0">
					<ActivityTypeIcon type={activity.activityType} />
				</div>
			)}
			<div className="min-w-0 flex-1">
				<p className="text-xs text-foreground truncate">
					<span className="font-medium">
						{activity.actorLogin ?? "Someone"}
					</span>{" "}
					<span className="text-muted-foreground">
						{activityVerb(activity.activityType)}
					</span>{" "}
					<span className="font-medium">{activity.title}</span>
				</p>
				<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
					<span>
						{activity.ownerLogin}/{activity.repoName}
					</span>
					<span className="text-muted-foreground/40">&middot;</span>
					<span>{formatRelative(activity.createdAt)}</span>
				</div>
			</div>
			<ActivityTypeIcon type={activity.activityType} />
		</Link>
	);
}

function activityVerb(type: string): string {
	switch (type) {
		case "pr_opened":
			return "opened PR";
		case "pr_closed":
			return "closed PR";
		case "pr_merged":
			return "merged PR";
		case "pr_review":
			return "reviewed PR";
		case "issue_opened":
			return "opened issue";
		case "issue_closed":
			return "closed issue";
		case "push":
			return "pushed to";
		default:
			return type.replace(/_/g, " ");
	}
}

function ActivityTypeIcon({ type }: { type: string }) {
	switch (type) {
		case "pr_opened":
			return <GitPullRequest className="size-3 text-green-500 shrink-0" />;
		case "pr_closed":
			return <GitPullRequest className="size-3 text-red-500 shrink-0" />;
		case "pr_merged":
			return <GitMerge className="size-3 text-purple-500 shrink-0" />;
		case "pr_review":
			return <MessageCircle className="size-3 text-yellow-500 shrink-0" />;
		case "issue_opened":
			return <CircleDot className="size-3 text-green-500 shrink-0" />;
		case "issue_closed":
			return <CircleDot className="size-3 text-purple-500 shrink-0" />;
		case "push":
			return <GitBranch className="size-3 text-blue-500 shrink-0" />;
		default:
			return <Activity className="size-3 text-muted-foreground shrink-0" />;
	}
}

// ---------------------------------------------------------------------------
// State icons (same as repo-overview-client.tsx to avoid circular deps)
// ---------------------------------------------------------------------------

function PrStateIcon({
	state,
	draft,
}: {
	state: "open" | "closed";
	draft: boolean;
}) {
	if (draft)
		return (
			<div className="mt-0.5 size-3.5 rounded-full border-2 border-muted-foreground shrink-0" />
		);
	if (state === "open")
		return (
			<svg
				className="mt-0.5 size-3.5 text-green-600 shrink-0"
				viewBox="0 0 16 16"
				fill="currentColor"
			>
				<path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
			</svg>
		);
	return (
		<svg
			className="mt-0.5 size-3.5 text-purple-600 shrink-0"
			viewBox="0 0 16 16"
			fill="currentColor"
		>
			<path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218Z" />
		</svg>
	);
}

function CheckDot({ conclusion }: { conclusion: string }) {
	if (conclusion === "success")
		return (
			<svg
				className="size-3 text-green-600 shrink-0 mt-0.5"
				viewBox="0 0 16 16"
				fill="currentColor"
			>
				<path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-.018-1.042.751.751 0 0 0-1.042-.018L6.75 9.19 5.28 7.72a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2 2a.75.75 0 0 0 1.06 0Z" />
			</svg>
		);
	if (conclusion === "failure")
		return (
			<svg
				className="size-3 text-red-600 shrink-0 mt-0.5"
				viewBox="0 0 16 16"
				fill="currentColor"
			>
				<path d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z" />
			</svg>
		);
	return (
		<svg
			className="size-3 text-yellow-600 shrink-0 mt-0.5"
			viewBox="0 0 16 16"
			fill="currentColor"
		>
			<path d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
		</svg>
	);
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
	return (
		<div className="h-full overflow-y-auto">
			<div className="mx-auto max-w-2xl px-6 py-8">
				{/* Header */}
				<div className="mb-8">
					<Skeleton className="h-5 w-32 mb-1" />
					<Skeleton className="h-3 w-44" />
				</div>
				{/* Stats */}
				<div className="grid grid-cols-3 gap-3 mb-8">
					<Skeleton className="h-16 rounded-lg" />
					<Skeleton className="h-16 rounded-lg" />
					<Skeleton className="h-16 rounded-lg" />
				</div>
				{/* PR section */}
				<div className="mb-8">
					<Skeleton className="h-4 w-48 mb-2" />
					<div className="divide-y rounded-lg border">
						{[1, 2, 3].map((i) => (
							<div key={i} className="flex items-start gap-2.5 px-3 py-2">
								<Skeleton className="size-3.5 rounded-full mt-0.5" />
								<div className="flex-1 space-y-1">
									<Skeleton className="h-3.5 w-3/4" />
									<Skeleton className="h-2.5 w-1/2" />
								</div>
							</div>
						))}
					</div>
				</div>
				{/* Activity section */}
				<div className="mb-8">
					<Skeleton className="h-4 w-32 mb-2" />
					<div className="divide-y rounded-lg border">
						{[1, 2, 3].map((i) => (
							<div key={i} className="flex items-center gap-2.5 px-3 py-2">
								<Skeleton className="size-5 rounded-full" />
								<div className="flex-1 space-y-1">
									<Skeleton className="h-3 w-4/5" />
									<Skeleton className="h-2.5 w-1/3" />
								</div>
							</div>
						))}
					</div>
				</div>
				{/* Repo grid */}
				<div>
					<Skeleton className="h-4 w-24 mb-2" />
					<div className="grid grid-cols-2 gap-2">
						{[1, 2, 3, 4].map((i) => (
							<Skeleton key={i} className="h-20 rounded-lg" />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
