import { Suspense } from "react";
import { serverQueries } from "@/lib/server-queries";
import { PrListClient } from "../pr-list-client";

export default async function PrListWithDetailSlot(props: {
	params: Promise<{ owner: string; name: string; number: string }>;
}) {
	const { owner, name } = await props.params;

	const prsPromise = serverQueries.listPullRequests.queryPromise({
		ownerLogin: owner,
		name,
		state: "open",
	});

	return (
		<Suspense>
			<PrListClient owner={owner} name={name} initialDataPromise={prsPromise} />
		</Suspense>
	);
}
