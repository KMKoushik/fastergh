import { GitPullRequest } from "lucide-react";

export default function RepoDetailDefault() {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="text-center">
				<GitPullRequest className="mx-auto size-10 text-muted-foreground/30" />
				<p className="mt-3 text-sm text-muted-foreground">
					Select an item to view details
				</p>
			</div>
		</div>
	);
}
