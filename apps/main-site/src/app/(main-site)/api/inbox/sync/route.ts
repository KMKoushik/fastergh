import { api } from "@packages/database/convex/_generated/api";
import { NextResponse } from "next/server";
import { fetchAuthAction } from "@/lib/auth-server";

export async function POST() {
	try {
		const result = await fetchAuthAction(
			api.rpc.notifications.syncNotifications,
			{},
		);
		if (
			typeof result === "object" &&
			result !== null &&
			"syncedCount" in result &&
			typeof result.syncedCount === "number"
		) {
			return new NextResponse(`Synced ${result.syncedCount} notifications.`, {
				status: 200,
			});
		}

		return new NextResponse("Sync completed.", { status: 200 });
	} catch (error) {
		if (error instanceof Error && error.message.length > 0) {
			const isNotSignedIn = error.message
				.toLowerCase()
				.includes("not signed in");
			return new NextResponse(error.message, {
				status: isNotSignedIn ? 401 : 500,
			});
		}

		return new NextResponse("Sync failed.", { status: 500 });
	}
}
