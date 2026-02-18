"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { GithubActionsModule } from "@packages/database/convex/rpc/githubActions";
import { createRpcModuleClientContext } from "./client-context";

export const {
	RpcClientProvider: GithubActionsProvider,
	useRpcClient: useGithubActions,
} = createRpcModuleClientContext<GithubActionsModule>(api.rpc.githubActions);
