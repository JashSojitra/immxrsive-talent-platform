import {
  AffiliationVerificationRequiredError,
  AuthenticationRequiredError,
} from "@/auth/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { StudentProfileError } from "@/profile/service";
import { MAX_PROFILE_BODY_BYTES } from "@/validation/student-profile";

export async function readStudentProfileJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_PROFILE_BODY_BYTES) throw new ProfileBodyError(413);
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_PROFILE_BODY_BYTES) {
    throw new ProfileBodyError(413);
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ProfileBodyError(400);
  }
}

export function studentProfileErrorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return apiErrorResponse(401, "AUTHENTICATION_REQUIRED", "Sign in to continue.");
  }
  if (error instanceof AffiliationVerificationRequiredError) {
    return apiErrorResponse(
      403,
      "AFFILIATION_REQUIRED",
      "Verify your Algoma University affiliation before editing a profile.",
    );
  }
  if (error instanceof StudentProfileError) {
    return apiErrorResponse(error.status, error.code, error.message);
  }
  if (error instanceof ProfileBodyError) {
    return error.status === 413
      ? apiErrorResponse(413, "PAYLOAD_TOO_LARGE", "Profile request is too large.")
      : apiErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  return apiErrorResponse(
    500,
    "INTERNAL_ERROR",
    "The private profile could not be updated right now.",
  );
}

class ProfileBodyError extends Error {
  constructor(readonly status: 400 | 413) {
    super("Invalid profile request body.");
  }
}
