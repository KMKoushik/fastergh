import { HomeDashboard } from "./home-dashboard-client";

/**
 * Root page for the @detail slot — shows the personalized launch pad at "/".
 * This must exist as a page.tsx (not just default.tsx) so that navigating
 * back to "/" from a nested route properly resolves the parallel route
 * instead of showing a stale detail panel.
 */
export default function DetailSlot() {
	return <HomeDashboard />;
}
