"use client";

import { Result, useAtom } from "@effect-atom/atom-react";
import { useSubscriptionWithInitial } from "@packages/confect/rpc";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@packages/ui/components/alert";
import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import { Link } from "@packages/ui/components/link";
import { cn } from "@packages/ui/lib/utils";
import { useBilling } from "@packages/ui/rpc/billing";
import { useProjectionQueries } from "@packages/ui/rpc/projection-queries";
import { Option } from "effect";
import { usePathname } from "next/navigation";
import { use, useEffect, useMemo } from "react";

const GITHUB_APP_SLUG = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? "";
const GITHUB_APP_INSTALL_URL = GITHUB_APP_SLUG
	? `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`
	: "";

type RepoOverview = {
	readonly repositoryId: number;
	readonly fullName: string;
	readonly ownerLogin: string;
	readonly name: string;
	readonly openPrCount: number;
	readonly openIssueCount: number;
	readonly failingCheckCount: number;
	readonly lastPushAt: number | null;
	readonly updatedAt: number;
} | null;

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

// --- Tab navigation (visually tabs, but real route links) ---

const TABS = [
	{ label: "Pull Requests", segment: "pulls" },
	{ label: "Issues", segment: "issues" },
	{ label: "Activity", segment: "activity" },
] as const;

function RepoTabNav({ owner, name }: { owner: string; name: string }) {
	const pathname = usePathname();
	const basePath = `/${owner}/${name}`;

	return (
		<nav className="mt-4 sm:mt-6 flex border-b">
			{TABS.map((tab) => {
				const href = `${basePath}/${tab.segment}`;
				// Active if pathname is exactly the tab route or starts with it (for nested routes within that tab)
				const isActive = pathname === href || pathname.startsWith(`${href}/`);

				return (
					<Link
						key={tab.segment}
						href={href}
						className={cn(
							"px-3 py-2 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors",
							isActive
								? "border-foreground text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
						)}
					>
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}

// --- Repo header with live subscription ---

function RepoHeader({
	owner,
	name,
	initialOverview,
}: {
	owner: string;
	name: string;
	initialOverview: RepoOverview;
}) {
	const client = useProjectionQueries();
	const overviewAtom = useMemo(
		() => client.getRepoOverview.subscription({ ownerLogin: owner, name }),
		[client, owner, name],
	);

	const overview = useSubscriptionWithInitial(overviewAtom, initialOverview);

	if (overview === null) {
		return <SyncRepoFromGitHub owner={owner} name={name} />;
	}

	return (
		<div>
			<h1 className="text-xl sm:text-2xl font-bold break-words">
				<span className="text-muted-foreground">{owner}/</span>
				{name}
			</h1>
			<div className="mt-2 sm:mt-3 flex flex-wrap gap-2 sm:gap-3">
				<Badge variant="secondary">
					{overview.openPrCount} open PR{overview.openPrCount !== 1 ? "s" : ""}
				</Badge>
				<Badge variant="secondary">
					{overview.openIssueCount} open issue
					{overview.openIssueCount !== 1 ? "s" : ""}
				</Badge>
				{overview.failingCheckCount > 0 && (
					<Badge variant="destructive">
						{overview.failingCheckCount} failing
					</Badge>
				)}
				{overview.lastPushAt && (
					<span className="text-xs sm:text-sm text-muted-foreground">
						Last push {formatRelative(overview.lastPushAt)}
					</span>
				)}
			</div>
		</div>
	);
}

// --- Sync repo from GitHub ---

function SyncRepoFromGitHub({ owner, name }: { owner: string; name: string }) {
	return (
		<div>
			<h1 className="text-2xl font-bold">
				{owner}/{name}
			</h1>
			<p className="mt-2 text-muted-foreground">
				This repository is not connected yet.
			</p>
			<div className="mt-4">
				<p className="text-sm text-muted-foreground">
					Install the GitHub App for this owner to start syncing data.
				</p>
				{GITHUB_APP_INSTALL_URL && (
					<Button asChild className="mt-3">
						<Link href={GITHUB_APP_INSTALL_URL}>Install GitHub App</Link>
					</Button>
				)}
			</div>
		</div>
	);
}

function OwnerBillingNotice({ owner }: { owner: string }) {
	const billing = useBilling();
	const [statusResult, loadStatus] = useAtom(
		billing.getOwnerSeatBillingStatus.call,
	);
	const [checkoutResult, startCheckout] = useAtom(
		billing.startOwnerSeatCheckout.call,
	);
	const [portalResult, openPortal] = useAtom(
		billing.openOwnerBillingPortal.call,
	);

	useEffect(() => {
		loadStatus({ ownerLogin: owner });
	}, [loadStatus, owner]);

	useEffect(() => {
		const checkoutValue = Result.value(checkoutResult);
		if (Option.isNone(checkoutValue)) return;
		if (checkoutValue.value.checkoutUrl === null) return;
		window.location.assign(checkoutValue.value.checkoutUrl);
	}, [checkoutResult]);

	useEffect(() => {
		const portalValue = Result.value(portalResult);
		if (Option.isNone(portalValue)) return;
		if (portalValue.value.url === null) return;
		window.location.assign(portalValue.value.url);
	}, [portalResult]);

	const statusValue = Result.value(statusResult);
	if (Option.isNone(statusValue)) return null;

	const status = statusValue.value;
	if (!status.isOrganization || !status.viewerCanManage) return null;

	const isCheckoutWaiting = Result.isWaiting(checkoutResult);
	const isPortalWaiting = Result.isWaiting(portalResult);
	const seatLabel = `${status.seatCount} seat${status.seatCount === 1 ? "" : "s"}`;

	if (status.hasAccess) {
		if (status.freeByHighStarRepo) {
			return (
				<div className="mt-4">
					<Alert>
						<AlertTitle>Free Access Active</AlertTitle>
						<AlertDescription>
							<p>
								{owner} has a repository above 1,000 stars, so organization
								billing is waived.
							</p>
						</AlertDescription>
					</Alert>
				</div>
			);
		}

		return (
			<div className="mt-4">
				<Button
					size="sm"
					variant="outline"
					disabled={!status.billingConfigured || isPortalWaiting}
					onClick={() => {
						openPortal({
							ownerLogin: owner,
							returnUrl: window.location.href,
						});
					}}
				>
					{isPortalWaiting ? "Opening billing..." : `Manage ${owner} billing`}
				</Button>
			</div>
		);
	}

	if (!status.billingConfigured || !status.requiresCheckout) {
		return null;
	}

	return (
		<div className="mt-4">
			<Alert>
				<AlertTitle>Billing Required for Organization Access</AlertTitle>
				<AlertDescription>
					<p>
						{owner} currently has {seatLabel}. Org billing is $50 per seat.
					</p>
					<Button
						size="sm"
						onClick={() => {
							startCheckout({
								ownerLogin: owner,
								successUrl: window.location.href,
							});
						}}
						disabled={isCheckoutWaiting}
					>
						{isCheckoutWaiting ? "Opening checkout..." : "Activate org billing"}
					</Button>
				</AlertDescription>
			</Alert>
		</div>
	);
}

// --- Layout shell ---

export function RepoLayoutClient({
	owner,
	name,
	initialOverviewPromise,
	children,
}: {
	owner: string;
	name: string;
	initialOverviewPromise: Promise<RepoOverview>;
	children: React.ReactNode;
}) {
	const initialOverview = use(initialOverviewPromise);

	return (
		<main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
			<div className="mb-4 sm:mb-6">
				<Link
					href="/"
					className="text-sm text-muted-foreground hover:text-foreground"
				>
					&larr; All repositories
				</Link>
			</div>
			<RepoHeader owner={owner} name={name} initialOverview={initialOverview} />
			<OwnerBillingNotice owner={owner} />
			<RepoTabNav owner={owner} name={name} />
			<div className="mt-4">{children}</div>
		</main>
	);
}
