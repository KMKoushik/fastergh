import { ArrowLeft } from "lucide-react";

export default function ListDefault() {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="text-center">
				<ArrowLeft className="mx-auto size-10 text-muted-foreground/30" />
				<p className="mt-3 text-sm text-muted-foreground">
					Select a repository
				</p>
			</div>
		</div>
	);
}
