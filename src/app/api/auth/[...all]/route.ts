import type { NextRequest } from "next/server";

import { getAuth, isGitHubAuthConfigured } from "@/auth/auth";

function handleAuthRequest(request: NextRequest) {
  if (!isGitHubAuthConfigured) {
    return Response.json(
      { error: { code: "AUTH_NOT_CONFIGURED", message: "Authentication is unavailable." } },
      { status: 503 },
    );
  }

  return getAuth().handler(request);
}

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;
