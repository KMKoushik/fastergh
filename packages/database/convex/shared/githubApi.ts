import { Context, Data, Effect, Layer } from "effect";
import { getInstallationToken } from "./githubApp";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class GitHubApiError extends Data.TaggedError("GitHubApiError")<{
	readonly status: number;
	readonly message: string;
	readonly url: string;
}> {}

/**
 * Thrown when GitHub returns a rate limit response (429 or 403 with
 * rate-limit headers). Includes the `retryAfterMs` hint from the
 * `Retry-After` / `X-RateLimit-Reset` headers so callers can back off.
 */
export class GitHubRateLimitError extends Data.TaggedError(
	"GitHubRateLimitError",
)<{
	readonly status: number;
	readonly message: string;
	readonly url: string;
	readonly retryAfterMs: number;
}> {}

export class GitHubTokenMissing extends Data.TaggedError(
	"GitHubTokenMissing",
)<{}> {}

// ---------------------------------------------------------------------------
// Token Provider (abstracts PAT vs. GitHub App installation tokens)
// ---------------------------------------------------------------------------

/**
 * A service that provides a GitHub API token.
 *
 * Two implementations:
 * - `Pat`: reads `GITHUB_PAT` from environment (legacy, for migration).
 * - `Installation(id)`: fetches short-lived GitHub App installation tokens.
 */
type IGitHubTokenProvider = Readonly<{
	/**
	 * Get a valid GitHub API token.
	 *
	 * For PAT, this is a static string read from env.
	 * For GitHub App installation tokens, this involves a fetch
	 * (cached until ~5 min before expiry).
	 */
	getToken: Effect.Effect<string>;
}>;

export class GitHubTokenProvider extends Context.Tag(
	"@quickhub/GitHubTokenProvider",
)<GitHubTokenProvider, IGitHubTokenProvider>() {
	/**
	 * Reads GITHUB_PAT from process.env.
	 * Dies with GitHubTokenMissing if not set (unrecoverable config error).
	 *
	 * @deprecated Use `Installation(installationId)` instead.
	 * Kept as fallback during migration.
	 */
	static Pat = Layer.succeed(
		this,
		GitHubTokenProvider.of({
			getToken: Effect.suspend(() => {
				const token = process.env.GITHUB_PAT;
				if (!token) {
					return Effect.die(new GitHubTokenMissing());
				}
				return Effect.succeed(token);
			}),
		}),
	);

	/**
	 * GitHub App installation token provider.
	 *
	 * Fetches short-lived installation tokens (1h validity, cached until
	 * ~5 min before expiry). Uses the App's private key to sign a JWT,
	 * then exchanges it for an installation access token.
	 *
	 * Requires GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY env vars.
	 */
	static Installation = (installationId: number) =>
		Layer.succeed(
			this,
			GitHubTokenProvider.of({
				getToken: Effect.orDie(getInstallationToken(installationId)),
			}),
		);
}

// ---------------------------------------------------------------------------
// GitHub API Client
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.github.com";

type IGitHubApiClient = Readonly<{
	/**
	 * Execute any fetch against the GitHub REST API.
	 * Handles auth headers, base URL resolution, and error wrapping.
	 *
	 * May fail with `GitHubRateLimitError` when GitHub returns 429
	 * or a 403 with `X-RateLimit-Remaining: 0`.
	 */
	use: <A>(
		fn: (
			fetch: (path: string, init?: RequestInit) => Promise<Response>,
		) => Promise<A>,
	) => Effect.Effect<A, GitHubApiError | GitHubRateLimitError>;
}>;

// ---------------------------------------------------------------------------
// Rate-limit detection helpers
// ---------------------------------------------------------------------------

/**
 * Parse the number of milliseconds to wait from GitHub rate-limit response
 * headers. Checks `Retry-After` (seconds) first, then falls back to
 * `X-RateLimit-Reset` (Unix epoch seconds).
 */
const parseRetryAfterMs = (res: Response): number => {
	const retryAfter = res.headers.get("Retry-After");
	if (retryAfter) {
		const secs = Number(retryAfter);
		if (!Number.isNaN(secs) && secs > 0) return secs * 1_000;
	}

	const resetEpoch = res.headers.get("X-RateLimit-Reset");
	if (resetEpoch) {
		const resetMs = Number(resetEpoch) * 1_000;
		const delta = resetMs - Date.now();
		if (delta > 0) return delta;
	}

	// Fallback: 60 seconds (conservative)
	return 60_000;
};

/**
 * Returns true when a GitHub response indicates a rate limit.
 * GitHub uses 429 for primary rate limits and 403 with specific
 * headers/messages for secondary (abuse) rate limits.
 */
const isRateLimitResponse = (res: Response): boolean => {
	if (res.status === 429) return true;
	if (res.status === 403) {
		const remaining = res.headers.get("X-RateLimit-Remaining");
		if (remaining === "0") return true;
	}
	return false;
};

// ---------------------------------------------------------------------------
// Client implementation
// ---------------------------------------------------------------------------

const makeClient = (token: string): IGitHubApiClient => {
	const headers: Record<string, string> = {
		Authorization: `token ${token}`,
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	};

	const authedFetch = async (
		path: string,
		init?: RequestInit,
	): Promise<Response> => {
		const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
		const res = await fetch(url, {
			...init,
			headers: { ...headers, ...init?.headers },
		});

		// Detect rate-limit responses before returning to the caller.
		// Throwing here causes the outer Effect.tryPromise to surface the
		// error, which the workflow retry policy will handle.
		if (isRateLimitResponse(res)) {
			throw new GitHubRateLimitError({
				status: res.status,
				message: `GitHub rate limit hit (${res.status}). Retry after ${Math.round(parseRetryAfterMs(res) / 1_000)}s.`,
				url: res.url,
				retryAfterMs: parseRetryAfterMs(res),
			});
		}

		return res;
	};

	const use: IGitHubApiClient["use"] = (fn) =>
		Effect.tryPromise({
			try: () => fn(authedFetch),
			catch: (cause) => {
				// Preserve GitHubRateLimitError so it propagates with its tag
				if (cause instanceof GitHubRateLimitError) return cause;
				return new GitHubApiError({
					status: 0,
					message: String(cause),
					url: "unknown",
				});
			},
		}).pipe(Effect.withSpan("github_api.use"));

	return { use };
};

/**
 * Constructs a GitHubApiClient by obtaining a token from
 * the GitHubTokenProvider service.
 */
const make = Effect.gen(function* () {
	const provider = yield* GitHubTokenProvider;
	const token = yield* provider.getToken;
	return makeClient(token);
});

export class GitHubApiClient extends Context.Tag("@quickhub/GitHubApiClient")<
	GitHubApiClient,
	IGitHubApiClient
>() {
	/**
	 * Layer that constructs the client from a GitHubTokenProvider.
	 * Requires GitHubTokenProvider to be provided in the context.
	 */
	static Default = Layer.effect(this, make).pipe(
		Layer.annotateSpans({ module: "GitHubApiClient" }),
	);

	/**
	 * @deprecated Use `forInstallation(installationId)` instead.
	 * Legacy layer backed by PAT from environment.
	 */
	static Live = Layer.provide(this.Default, GitHubTokenProvider.Pat);

	/**
	 * Production layer: GitHubApiClient backed by a GitHub App
	 * installation token for the given installation.
	 */
	static forInstallation = (installationId: number) =>
		Layer.provide(
			this.Default,
			GitHubTokenProvider.Installation(installationId),
		);

	/**
	 * Test/manual layer: construct a client from an explicit token string.
	 */
	static fromToken = (token: string) => Layer.succeed(this, makeClient(token));
}
