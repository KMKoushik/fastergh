import { Providers } from "@packages/ui/components/providers";
import type { Metadata } from "next";
import { Suspense } from "react";
import { HubShell } from "./_components/hub-shell";

export const metadata: Metadata = {
	title: "QuickHub — GitHub Mirror",
	description: "Fast GitHub browsing backed by Convex real-time projections",
};

export default function MainSiteLayout({
	children,
	sidebar,
	detail,
}: {
	children: React.ReactNode;
	sidebar: React.ReactNode;
	detail: React.ReactNode;
}) {
	return (
		<Providers>
			<HubShell sidebar={sidebar} detail={detail} />
			{/*
			 * Hidden children slot — only used for route resolution stubs
			 * (pages that return null or redirect). The Suspense is required
			 * for prerender safety (github/setup awaits searchParams) but
			 * has zero visual impact since the container is hidden.
			 */}
			<div className="hidden">
				<Suspense>{children}</Suspense>
			</div>
		</Providers>
	);
}
