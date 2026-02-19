import { redirect } from "next/navigation";
import { Suspense } from "react";

/**
 * When navigating to /{owner}/{name} without a tab, redirect to pulls.
 * This default is needed so the @sidebar slot doesn't go stale.
 */
export default function SidebarRepoDefault(props: {
	params: Promise<{ owner: string; name: string }>;
}) {
	return (
		<Suspense>
			<SidebarRepoRedirect paramsPromise={props.params} />
		</Suspense>
	);
}

async function SidebarRepoRedirect({
	paramsPromise,
}: {
	paramsPromise: Promise<{ owner: string; name: string }>;
}): Promise<React.ReactNode> {
	const { owner, name } = await paramsPromise;
	redirect(`/${owner}/${name}/pulls`);
}
