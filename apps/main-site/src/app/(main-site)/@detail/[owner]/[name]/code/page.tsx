import { FileViewer } from "./file-viewer";

export default async function CodeDetailPage({
	params,
	searchParams,
}: {
	params: Promise<{ owner: string; name: string }>;
	searchParams: Promise<{ path?: string }>;
}) {
	const { owner, name } = await params;
	const { path } = await searchParams;
	return <FileViewer owner={owner} name={name} path={path ?? null} />;
}
