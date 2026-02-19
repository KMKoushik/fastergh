import { redirect } from "next/navigation";
import { Suspense } from "react";

/**
 * When navigating to /{owner}/{name} without a tab, redirect to pulls.
 * This default is needed so the @list slot doesn't go stale.
 */
export default function ListRepoDefault(props: {
	params: Promise<{ owner: string; name: string }>;
}) {
	return (
		<Suspense>
			<ListRepoRedirect paramsPromise={props.params} />
		</Suspense>
	);
}

async function ListRepoRedirect({
	paramsPromise,
}: {
	paramsPromise: Promise<{ owner: string; name: string }>;
}): Promise<React.ReactNode> {
	const { owner, name } = await paramsPromise;
	redirect(`/${owner}/${name}/pulls`);
}
