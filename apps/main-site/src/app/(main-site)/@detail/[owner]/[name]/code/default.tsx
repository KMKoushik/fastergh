import { FileViewer } from "./file-viewer";

/**
 * Fallback for the @detail slot when navigating to /code without a path.
 */
export default async function CodeDetailDefault({
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
