"use client";

import type { PatchDiffProps } from "@pierre/diffs/react";
import { PatchDiff } from "@pierre/diffs/react";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Mount queue — ensures only one PatchDiff mounts per idle callback so large
// PRs don't jam the main thread by mounting many diffs simultaneously.
// ---------------------------------------------------------------------------

type MountCallback = () => void;

interface DiffMountQueue {
	enqueue(cb: MountCallback): () => void;
}

function createDiffMountQueue(): DiffMountQueue {
	const queue: Array<{ cb: MountCallback; cancelled: boolean }> = [];
	let draining = false;

	function drain() {
		if (draining) return;
		draining = true;

		function step() {
			// Skip cancelled entries
			while (queue.length > 0 && queue[0]!.cancelled) {
				queue.shift();
			}
			if (queue.length === 0) {
				draining = false;
				return;
			}
			const entry = queue.shift()!;
			if (!entry.cancelled) {
				entry.cb();
			}
			// Yield to the browser between each mount
			if ("requestIdleCallback" in window) {
				requestIdleCallback(step, { timeout: 80 });
			} else {
				setTimeout(step, 16);
			}
		}

		if ("requestIdleCallback" in window) {
			requestIdleCallback(step, { timeout: 80 });
		} else {
			setTimeout(step, 16);
		}
	}

	return {
		enqueue(cb: MountCallback) {
			const entry = { cb, cancelled: false };
			queue.push(entry);
			drain();
			return () => {
				entry.cancelled = true;
			};
		},
	};
}

const DiffMountQueueContext = createContext<DiffMountQueue | null>(null);

export function DiffMountQueueProvider({ children }: { children: ReactNode }) {
	const queueRef = useRef<DiffMountQueue | null>(null);
	if (queueRef.current === null) {
		queueRef.current = createDiffMountQueue();
	}
	return (
		<DiffMountQueueContext.Provider value={queueRef.current}>
			{children}
		</DiffMountQueueContext.Provider>
	);
}

// ---------------------------------------------------------------------------
// LazyPatchDiff — viewport-aware + staggered mounting
// ---------------------------------------------------------------------------

interface LazyPatchDiffProps<LAnnotation = undefined>
	extends Omit<PatchDiffProps<LAnnotation>, "patch"> {
	patch: string;
	/** How many pixels before the element enters the viewport to start loading */
	rootMargin?: string;
}

export function LazyPatchDiff<LAnnotation = undefined>({
	patch,
	rootMargin = "300px",
	...patchDiffProps
}: LazyPatchDiffProps<LAnnotation>) {
	const sentinelRef = useRef<HTMLDivElement>(null);
	const [shouldMount, setShouldMount] = useState(false);
	const mountQueue = useContext(DiffMountQueueContext);

	useEffect(() => {
		const el = sentinelRef.current;
		if (!el || shouldMount) return;

		let cancelQueue = () => {};

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						observer.disconnect();
						if (mountQueue) {
							cancelQueue = mountQueue.enqueue(() => setShouldMount(true));
						} else {
							setShouldMount(true);
						}
					}
				}
			},
			{ rootMargin },
		);

		observer.observe(el);
		return () => {
			observer.disconnect();
			cancelQueue();
		};
	}, [shouldMount, rootMargin, mountQueue]);

	if (!shouldMount) {
		return (
			<div
				ref={sentinelRef}
				className="flex items-center justify-center py-8 text-xs text-muted-foreground bg-muted/10"
			>
				&nbsp;
			</div>
		);
	}

	return <PatchDiff patch={patch} {...patchDiffProps} />;
}
