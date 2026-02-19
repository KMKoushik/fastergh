import { redirect } from "next/navigation";

// Redirect bare /{owner}/{name} to /{owner}/{name}/pulls
export default async function RepoPage(props: {
	params: Promise<{ owner: string; name: string }>;
}) {
	const { owner, name } = await props.params;
	redirect(`/${owner}/${name}/pulls`);
}
