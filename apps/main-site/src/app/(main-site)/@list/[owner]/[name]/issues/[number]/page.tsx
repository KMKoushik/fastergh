import { Suspense } from "react";
import { serverQueries } from "@/lib/server-queries";
import { ListSkeleton } from "../../../../../_components/skeletons";
import { IssueListClient } from "../issue-list-client";

export default async function IssueListWithDetailSlot(props: {
	params: Promise<{ owner: string; name: string; number: string }>;
}) {
	const { owner, name } = await props.params;

	const issuesPromise = serverQueries.listIssues.queryPromise({
		ownerLogin: owner,
		name,
		state: "open",
	});

	return (
		<Suspense fallback={<ListSkeleton />}>
			<IssueListClient
				owner={owner}
				name={name}
				initialDataPromise={issuesPromise}
			/>
		</Suspense>
	);
}
