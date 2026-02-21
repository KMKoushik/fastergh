import { connection } from "next/server";
import { Suspense } from "react";
import { serverNotifications } from "@/lib/server-notifications";
import {
	NotificationsClient,
	NotificationsSkeleton,
} from "./notifications-client";

export default function NotificationsDefault() {
	return (
		<Suspense fallback={<NotificationsSkeleton />}>
			<NotificationsContent />
		</Suspense>
	);
}

async function NotificationsContent() {
	await connection();
	const initialNotifications =
		await serverNotifications.listNotifications.queryPromise({});
	return <NotificationsClient initialNotifications={initialNotifications} />;
}
