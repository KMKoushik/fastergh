import { type ReactNode, Suspense } from "react";
import { HubShell } from "./hub-shell";
import { type MainSiteNavContext, MainSiteSidebar } from "./main-site-sidebar";

const defaultNavContextPromise: Promise<MainSiteNavContext> = Promise.resolve({
	owner: null,
	name: null,
});

export function MainSiteShell({
	sidebar,
	detail,
	navContextPromise = defaultNavContextPromise,
}: {
	sidebar: ReactNode;
	detail: ReactNode;
	navContextPromise?: Promise<MainSiteNavContext>;
}) {
	return (
		<HubShell
			sidebar={
				<Suspense fallback={<SidebarShellFallback />}>
					<MainSiteSidebar navContextPromise={navContextPromise}>
						{sidebar}
					</MainSiteSidebar>
				</Suspense>
			}
			detail={<Suspense fallback={<DetailShellFallback />}>{detail}</Suspense>}
		/>
	);
}

function SidebarShellFallback() {
	return <div className="h-full animate-pulse bg-sidebar/60" />;
}

function DetailShellFallback() {
	return <div className="h-full animate-pulse bg-background" />;
}
