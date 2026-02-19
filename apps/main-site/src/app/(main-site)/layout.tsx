import { Providers } from "@packages/ui/components/providers";
import type { Metadata } from "next";
import { HubLayoutWrapper } from "./hub-layout-wrapper";

export const metadata: Metadata = {
	title: "QuickHub — GitHub Mirror",
	description: "Fast GitHub browsing backed by Convex real-time projections",
};

export default function MainSiteLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<Providers>
			<HubLayoutWrapper />
			{/* Route pages exist for URL resolution but are hidden */}
			<div className="hidden">{children}</div>
		</Providers>
	);
}
