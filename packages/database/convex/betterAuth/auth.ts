import { createAuth } from "../auth";

// Export a static instance for Better Auth schema generation.
// The dummy context is only used at schema generation time.
// biome-ignore lint/suspicious/noExplicitAny: required by Better Auth schema generation tooling
export const auth = createAuth({} as any);
