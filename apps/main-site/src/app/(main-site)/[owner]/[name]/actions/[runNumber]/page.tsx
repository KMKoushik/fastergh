import { Link } from "@packages/ui/components/link";
import { Skeleton } from "@packages/ui/components/skeleton";
import { Suspense } from "react";
import { serverQueries } from "@/lib/server-queries";
import { WorkflowRunDetailClient } from "./run-detail-client";

export default async function WorkflowRunDetailPage(props: {
	params: Promise<{ owner: string; name: string; runNumber: string }>;
}) {
	const params = await props.params;
	const { owner, name } = params;
	const runNumber = parseInt(params.runNumber, 10);

	const runPromise = serverQueries.getWorkflowRunDetail.queryPromise({
		ownerLogin: owner,
		name,
		runNumber,
	});

	return (
		<div className="max-w-4xl">
			<div className="mb-6">
				<Link
					href={`/${owner}/${name}/actions`}
					className="text-sm text-muted-foreground hover:text-foreground"
				>
					&larr; Workflow Runs
				</Link>
			</div>

			<Suspense fallback={<DetailSkeleton />}>
				<WorkflowRunDetailClient
					owner={owner}
					name={name}
					runNumber={runNumber}
					initialDataPromise={runPromise}
				/>
			</Suspense>
		</div>
	);
}

function DetailSkeleton() {
	return (
		<div>
			<Skeleton className="h-8 w-3/4" />
			<Skeleton className="mt-3 h-5 w-1/2" />
			<Skeleton className="mt-6 h-6 w-32" />
			<div className="mt-4 space-y-3">
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
			</div>
		</div>
	);
}
