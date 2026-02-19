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
	list,
	detail,
}: {
	children: React.ReactNode;
	sidebar: React.ReactNode;
	list: React.ReactNode;
	detail: React.ReactNode;
}) {
	return (
		<Providers>
			<HubShell sidebar={sidebar} list={list} detail={detail} />
			{/* children slot for route pages that handle redirects etc */}
			<div className="hidden">
				<Suspense>{children}</Suspense>
			</div>
		</Providers>
	);
}
