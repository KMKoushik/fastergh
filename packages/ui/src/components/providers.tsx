"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";
import { ConvexClientProvider } from "./convex-client-provider";
import { DiffsWorkerProvider } from "./diffs-worker-provider";
import { HydrationProvider } from "./hydration-context";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<HydrationProvider>
			<NextThemesProvider
				attribute="class"
				defaultTheme="system"
				enableSystem
				enableColorScheme
			>
				<ConvexClientProvider>
					<DiffsWorkerProvider>{children}</DiffsWorkerProvider>
				</ConvexClientProvider>
			</NextThemesProvider>
		</HydrationProvider>
	);
}
