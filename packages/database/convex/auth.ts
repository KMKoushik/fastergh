import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";

// ---------------------------------------------------------------------------
// Better Auth component client (local install mode)
// ---------------------------------------------------------------------------

export const authComponent = createClient<DataModel, typeof authSchema>(
	components.betterAuth,
	{
		local: {
			schema: authSchema,
		},
		verbose: false,
	},
);

// ---------------------------------------------------------------------------
// Auth options factory
// ---------------------------------------------------------------------------

const siteUrl = process.env.SITE_URL;

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
	return {
		baseURL: siteUrl,
		database: authComponent.adapter(ctx),
		account: {
			accountLinking: {
				enabled: true,
				allowDifferentEmails: true,
			},
		},
		socialProviders: {
			github: {
				clientId: process.env.GITHUB_CLIENT_ID ?? "",
				clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
				// Request repo scope so the user token can list repos for app installation
				scope: ["read:user", "user:email"],
			},
		},
		plugins: [
			convex({
				authConfig,
			}),
		],
	} satisfies BetterAuthOptions;
};

// ---------------------------------------------------------------------------
// Auth instance factory
// ---------------------------------------------------------------------------

export const createAuth = (ctx: GenericCtx<DataModel>) =>
	betterAuth(createAuthOptions(ctx));

// ---------------------------------------------------------------------------
// Client API helpers
// ---------------------------------------------------------------------------

export const { getAuthUser } = authComponent.clientApi();

/**
 * Get the current authenticated user (or null if not signed in).
 * Used from the client via subscription.
 */
export const getCurrentUser = query({
	args: {},
	returns: undefined,
	handler: async (ctx) => {
		return authComponent.safeGetAuthUser(ctx);
	},
});
