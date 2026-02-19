"use client";

import { Link } from "@packages/ui/components/link";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@packages/ui/components/resizable";
import { ArrowLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Parse route info from the pathname for mobile view decisions.
 */
function useRouteInfo() {
	const pathname = usePathname();
	const segments = pathname.split("/").filter(Boolean);

	if (segments.length >= 2) {
		const owner = segments[0] ?? null;
		const name = segments[1] ?? null;
		const tabSegment = segments[2];
		const tab =
			tabSegment === "issues"
				? "issues"
				: tabSegment === "actions"
					? "actions"
					: "pulls";
		const hasDetail = segments.length >= 4;
		return { owner, name, tab, hasDetail };
	}

	return { owner: null, name: null, tab: "pulls", hasDetail: false };
}

/**
 * Three-panel resizable shell that positions parallel route slots.
 * On mobile, shows only the deepest active panel with back navigation.
 */
export function HubShell({
	sidebar,
	list,
	detail,
}: {
	sidebar: ReactNode;
	list: ReactNode;
	detail: ReactNode;
}) {
	const { owner, name, tab, hasDetail } = useRouteInfo();

	return (
		<div className="h-dvh w-full">
			{/* Desktop: three-panel resizable */}
			<div className="hidden md:block h-full">
				<ResizablePanelGroup direction="horizontal" className="h-full">
					{/* Panel 1: Repos */}
					<ResizablePanel
						defaultSize={18}
						minSize={14}
						maxSize={30}
						className="border-r"
					>
						{sidebar}
					</ResizablePanel>

					<ResizableHandle />

					{/* Panel 2: List (PRs/Issues/Actions) */}
					<ResizablePanel
						defaultSize={28}
						minSize={20}
						maxSize={45}
						className="border-r"
					>
						{list}
					</ResizablePanel>

					<ResizableHandle />

					{/* Panel 3: Detail/Content */}
					<ResizablePanel defaultSize={54} minSize={30}>
						{detail}
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>

			{/* Mobile: stacked view — show deepest active panel */}
			<div className="md:hidden h-full">
				{owner && name && hasDetail ? (
					<div className="flex h-full flex-col">
						<div className="shrink-0 flex items-center gap-2 border-b px-3 py-2">
							<Link
								href={`/${owner}/${name}/${tab}`}
								className="text-xs text-muted-foreground hover:text-foreground no-underline flex items-center gap-1"
							>
								<ArrowLeft className="size-3.5" />
								Back to list
							</Link>
						</div>
						<div className="flex-1 overflow-y-auto">{detail}</div>
					</div>
				) : owner && name ? (
					<div className="flex h-full flex-col">
						<div className="shrink-0 flex items-center gap-2 border-b px-3 py-2">
							<Link
								href="/"
								className="text-xs text-muted-foreground hover:text-foreground no-underline flex items-center gap-1"
							>
								<ArrowLeft className="size-3.5" />
								Repos
							</Link>
							<span className="text-xs font-medium truncate">
								{owner}/{name}
							</span>
						</div>
						{list}
					</div>
				) : (
					sidebar
				)}
			</div>
		</div>
	);
}
