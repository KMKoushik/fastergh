import { Suspense } from "react";
import { serverQueries } from "@/lib/server-queries";
import { ListSkeleton } from "../../../../_components/skeletons";
import { ActionsListClient } from "./actions-list-client";

export default async function ActionsListSlot(props: {
	params: Promise<{ owner: string; name: string }>;
}) {
	const { owner, name } = await props.params;

	const runsPromise = serverQueries.listWorkflowRuns.queryPromise({
		ownerLogin: owner,
		name,
	});

	return (
		<Suspense fallback={<ListSkeleton />}>
			<ActionsListClient
				owner={owner}
				name={name}
				initialDataPromise={runsPromise}
			/>
		</Suspense>
	);
}
