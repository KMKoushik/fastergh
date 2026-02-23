"use client";

import { RepoNavSelector } from "./repo-nav-selector";
import { SidebarClient } from "./sidebar-client";
import { SidebarRouter } from "./sidebar-router";

/**
 * Sidebar chrome + content router.
 *
 * Fully client-side — no server components, no async, no Suspense triggers
 * on navigation. The `SidebarRouter` reads the URL client-side and renders
 * the appropriate sidebar body.
 */
export function MainSiteSidebar() {
	return (
		<SidebarClient navSelector={<RepoNavSelector initialRepos={[]} />}>
			<SidebarRouter />
		</SidebarClient>
	);
}
