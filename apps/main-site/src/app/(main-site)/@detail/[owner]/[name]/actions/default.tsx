import { Play } from "lucide-react";

export default function ActionsDetailDefault() {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="text-center">
				<Play className="mx-auto size-10 text-muted-foreground/30" />
				<p className="mt-3 text-sm text-muted-foreground">
					Select a workflow run to view details
				</p>
			</div>
		</div>
	);
}
