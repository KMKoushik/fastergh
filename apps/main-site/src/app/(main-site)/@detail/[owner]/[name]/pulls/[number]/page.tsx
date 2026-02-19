import { Suspense } from "react";
import { serverQueries } from "@/lib/server-queries";
import { DetailSkeleton } from "../../../../../_components/skeletons";
import { PrDetailClient } from "./pr-detail-client";

export default async function PrDetailSlot(props: {
	params: Promise<{ owner: string; name: string; number: string }>;
}) {
	const params = await props.params;
	const { owner, name } = params;
	const num = Number.parseInt(params.number, 10);

	const prPromise = serverQueries.getPullRequestDetail.queryPromise({
		ownerLogin: owner,
		name,
		number: num,
	});

	const filesPromise = serverQueries.listPrFiles.queryPromise({
		ownerLogin: owner,
		name,
		number: num,
	});

	return (
		<Suspense fallback={<DetailSkeleton />}>
			<PrDetailClient
				owner={owner}
				name={name}
				prNumber={num}
				initialPrPromise={prPromise}
				initialFilesPromise={filesPromise}
			/>
		</Suspense>
	);
}
