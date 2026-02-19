import { Suspense } from "react";
import { serverQueries } from "@/lib/server-queries";
import { ActionsListClient } from "../actions-list-client";

export default async function ActionsListWithDetailSlot(props: {
	params: Promise<{ owner: string; name: string; runNumber: string }>;
}) {
	const { owner, name } = await props.params;

	const runsPromise = serverQueries.listWorkflowRuns.queryPromise({
		ownerLogin: owner,
		name,
	});

	return (
		<Suspense>
			<ActionsListClient
				owner={owner}
				name={name}
				initialDataPromise={runsPromise}
			/>
		</Suspense>
	);
}
