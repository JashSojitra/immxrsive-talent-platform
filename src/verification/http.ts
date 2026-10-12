import { AuthenticationRequiredError } from "@/auth/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { AffiliationVerificationError } from "@/verification/service";

export const MAX_VERIFICATION_BODY_BYTES = 4_096;

export async function readVerificationJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_VERIFICATION_BODY_BYTES) throw new InvalidBodyError(413);
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_VERIFICATION_BODY_BYTES) {
    throw new InvalidBodyError(413);
  }
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new InvalidBodyError(400);
  }
}

export function verificationErrorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return apiErrorResponse(401, "AUTHENTICATION_REQUIRED", "Sign in to continue.");
  }
  if (error instanceof AffiliationVerificationError) {
    return apiErrorResponse(error.status, error.code, error.message);
  }
  if (error instanceof InvalidBodyError) {
    return error.status === 413
      ? apiErrorResponse(413, "PAYLOAD_TOO_LARGE", "Verification request is too large.")
      : apiErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  return apiErrorResponse(
    500,
    "INTERNAL_ERROR",
    "The verification request could not be completed right now.",
  );
}

export function clientAddressFromRequest(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unavailable";
}

class InvalidBodyError extends Error {
  constructor(readonly status: 400 | 413) {
    super("Invalid verification request body.");
  }
}
