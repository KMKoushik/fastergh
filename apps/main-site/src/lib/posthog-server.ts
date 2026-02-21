import "server-only";

import { PostHog } from "posthog-node";

const posthogKey = process.env.POSTHOG_KEY;
const posthogHost = process.env.POSTHOG_HOST;

export function createPostHogServerClient() {
	if (!posthogKey || !posthogHost) {
		return null;
	}

	return new PostHog(posthogKey, {
		host: posthogHost,
		flushAt: 1,
		flushInterval: 0,
	});
}

export async function withPostHogServerClient<Result>(
	execute: (posthogClient: PostHog) => Promise<Result>,
) {
	const posthogClient = createPostHogServerClient();
	if (!posthogClient) {
		return null;
	}

	try {
		return await execute(posthogClient);
	} finally {
		await posthogClient.shutdown();
	}
}
