import { Suspense } from "react";
import { serverQueries } from "@/lib/server-queries";
import { WorkflowRunListClient } from "./actions-client";

export default async function ActionsPage(props: {
	params: Promise<{ owner: string; name: string }>;
}) {
	const params = await props.params;
	const { owner, name } = params;

	// Prefetch workflow runs — don't await, pass as promise
	const runsPromise = serverQueries.listWorkflowRuns.queryPromise({
		ownerLogin: owner,
		name,
	});

	return (
		<Suspense>
			<WorkflowRunListClient
				owner={owner}
				name={name}
				initialDataPromise={runsPromise}
			/>
		</Suspense>
	);
}
