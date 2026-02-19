"use client";

import { WorkerPoolContextProvider } from "@pierre/diffs/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

function workerFactory() {
	return new Worker(
		new URL("@pierre/diffs/worker/worker.js", import.meta.url),
		{ type: "module" },
	);
}

const highlighterOptions = {
	tokenizeMaxLineLength: 1000,
};

export function DiffsWorkerProvider({ children }: { children: ReactNode }) {
	const poolOptions = useMemo(
		() => ({
			workerFactory,
			poolSize:
				typeof navigator !== "undefined" && navigator.hardwareConcurrency
					? Math.min(navigator.hardwareConcurrency, 8)
					: 4,
		}),
		[],
	);

	return (
		<WorkerPoolContextProvider
			poolOptions={poolOptions}
			highlighterOptions={highlighterOptions}
		>
			{children}
		</WorkerPoolContextProvider>
	);
}
