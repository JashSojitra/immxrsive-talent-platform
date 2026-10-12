import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

import {
  GITHUB_OAUTH_SCOPES,
  GITHUB_PROVIDER_ID,
} from "@/auth/config";
import { getRuntimeDatabase } from "@/db/runtime";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
} from "@/db/schema";

export const isGitHubAuthConfigured = Boolean(
  process.env.GITHUB_CLIENT_ID &&
    process.env.GITHUB_CLIENT_SECRET &&
    process.env.BETTER_AUTH_SECRET,
);

function createAuth() {
  if (!isGitHubAuthConfigured) {
    throw new Error("GitHub authentication is not configured.");
  }

  return betterAuth({
    appName: "ImmXrsive Talent Platform",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getRuntimeDatabase(), {
      provider: "pg",
      schema: {
        user: authUsers,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
      },
    }),
    socialProviders: {
      [GITHUB_PROVIDER_ID]: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        disableDefaultScope: true,
        scope: [...GITHUB_OAUTH_SCOPES],
      },
    },
    account: {
      encryptOAuthTokens: true,
      storeStateStrategy: "database",
      accountLinking: {
        enabled: false,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      cookiePrefix: "immxrsive",
    },
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}
