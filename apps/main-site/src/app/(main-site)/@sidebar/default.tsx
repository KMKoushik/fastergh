import { Suspense } from "react";
import { SidebarClient } from "./sidebar-client";

export default function SidebarSlot() {
	return (
		<Suspense>
			<SidebarClient />
		</Suspense>
	);
}
