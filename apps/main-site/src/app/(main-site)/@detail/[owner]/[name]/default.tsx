import { Suspense } from "react";
import { SyncProgressOverlay } from "../../../_components/sync-progress-client";
import { RepoOverviewPanel } from "./repo-overview-client";

/**
 * Detail panel for the repo overview page (/:owner/:name).
 * Shows the RepoOverviewPanel with stats, recent PRs, and issues.
 */
export default async function RepoDetailDefault({
	params,
}: {
	params: Promise<{ owner: string; name: string }>;
}) {
	const { owner, name } = await params;

	return (
		<Suspense>
			<SyncProgressOverlay owner={owner} name={name}>
				<RepoOverviewPanel owner={owner} name={name} />
			</SyncProgressOverlay>
		</Suspense>
	);
}
