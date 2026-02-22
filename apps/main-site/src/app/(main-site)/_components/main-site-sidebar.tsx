import { Skeleton } from "@packages/ui/components/skeleton";
import { type ReactNode, Suspense } from "react";
import { serverQueries } from "@/lib/server-queries";
import { SidebarClient } from "../@sidebar/sidebar-client";
import { RepoNavSelector } from "./repo-nav-selector";

export type MainSiteNavContext = {
	owner: string | null;
	name: string | null;
	activeTab?: string;
};

export function MainSiteSidebar({
	children,
	navContextPromise,
}: {
	children: ReactNode;
	navContextPromise: Promise<MainSiteNavContext>;
}) {
	return (
		<SidebarClient
			navSelector={
				<Suspense fallback={<NavSelectorFallback />}>
					<NavSelectorContent navContextPromise={navContextPromise} />
				</Suspense>
			}
		>
			{children}
		</SidebarClient>
	);
}

async function NavSelectorContent({
	navContextPromise,
}: {
	navContextPromise: Promise<MainSiteNavContext>;
}) {
	const [navContext, initialRepos] = await Promise.all([
		navContextPromise,
		serverQueries.listRepos.queryPromise({}),
	]);

	return (
		<RepoNavSelector
			owner={navContext.owner}
			name={navContext.name}
			activeTab={navContext.activeTab}
			initialRepos={initialRepos}
		/>
	);
}

function NavSelectorFallback() {
	return (
		<div className="shrink-0 px-2 pt-2.5 pb-1.5 border-b border-sidebar-border">
			<Skeleton className="h-8 w-full rounded-sm" />
		</div>
	);
}
