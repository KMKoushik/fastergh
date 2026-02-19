import { redirect } from "next/navigation";

/**
 * When navigating to /{owner}/{name} without a tab, redirect to pulls.
 * This default is needed so the @list slot doesn't go stale.
 */
export default async function ListRepoDefault(props: {
	params: Promise<{ owner: string; name: string }>;
}) {
	const { owner, name } = await props.params;
	redirect(`/${owner}/${name}/pulls`);
}
