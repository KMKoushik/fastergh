import { Suspense } from "react";
import { serverQueries } from "@/lib/server-queries";
import { ActionsListClient } from "../../../../_components/actions-list-client";
import { ListSkeleton } from "../../../../_components/skeletons";

export default function ActionsListSlot(props: {
	params: Promise<{ owner: string; name: string }>;
}) {
	return (
		<Suspense fallback={<ListSkeleton />}>
			<ActionsListContent paramsPromise={props.params} />
		</Suspense>
	);
}

async function ActionsListContent({
	paramsPromise,
}: {
	paramsPromise: Promise<{ owner: string; name: string }>;
}) {
	const { owner, name } = await paramsPromise;

	const initialData = await serverQueries.listWorkflowRuns.queryPromise({
		ownerLogin: owner,
		name,
	});

	return (
		<ActionsListClient owner={owner} name={name} initialData={initialData} />
	);
}
