/**
 * Localized skeleton fallbacks for Suspense boundaries inside page.tsx files.
 * These are intentionally lightweight — they show inside the panel, not replacing it.
 */

export function ListSkeleton() {
	return (
		<div className="flex h-full flex-col animate-pulse">
			<div className="shrink-0 border-b p-3 space-y-2">
				<div className="h-4 w-24 rounded bg-muted" />
				<div className="flex gap-2">
					<div className="h-6 w-12 rounded bg-muted" />
					<div className="h-6 w-12 rounded bg-muted" />
					<div className="h-6 w-12 rounded bg-muted" />
				</div>
			</div>
			<div className="flex-1 p-2 space-y-2">
				{Array.from({ length: 8 }, (_, i) => (
					<div key={i} className="flex gap-2 rounded-md px-2.5 py-2">
						<div className="size-3.5 rounded-full bg-muted shrink-0 mt-0.5" />
						<div className="flex-1 space-y-1.5">
							<div className="h-3 w-3/4 rounded bg-muted" />
							<div className="h-2.5 w-1/2 rounded bg-muted" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export function DetailSkeleton() {
	return (
		<div className="p-4 animate-pulse space-y-4">
			<div className="flex items-start gap-2">
				<div className="size-5 rounded-full bg-muted shrink-0 mt-1" />
				<div className="flex-1 space-y-2">
					<div className="h-5 w-2/3 rounded bg-muted" />
					<div className="h-3 w-1/3 rounded bg-muted" />
				</div>
			</div>
			<div className="h-24 rounded-md bg-muted" />
			<div className="h-3 w-1/4 rounded bg-muted" />
			<div className="space-y-2">
				{Array.from({ length: 4 }, (_, i) => (
					<div key={i} className="h-8 rounded-md bg-muted" />
				))}
			</div>
		</div>
	);
}
