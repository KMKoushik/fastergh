import { CircleDot } from "lucide-react";

export default function IssuesDetailDefault() {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="text-center">
				<CircleDot className="mx-auto size-10 text-muted-foreground/30" />
				<p className="mt-3 text-sm text-muted-foreground">
					Select an issue to view details
				</p>
			</div>
		</div>
	);
}
