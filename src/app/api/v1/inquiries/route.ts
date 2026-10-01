import { createContextualInquiry } from "@/db/queries/inquiry";
import { getRuntimeDatabase } from "@/db/runtime";
import { apiErrorResponse } from "@/lib/api-errors";
import {
  inquiryRequestSchema,
  inquiryValidationDetails,
  MAX_INQUIRY_BODY_BYTES,
} from "@/validation/inquiry";

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_INQUIRY_BODY_BYTES) return payloadTooLarge();

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return apiErrorResponse(400, "INVALID_REQUEST", "Unable to read the request body.");
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_INQUIRY_BODY_BYTES) {
    return payloadTooLarge();
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return apiErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const validation = inquiryRequestSchema.safeParse(body);
  if (!validation.success) {
    return apiErrorResponse(
      422,
      "VALIDATION_ERROR",
      "Review the highlighted inquiry fields.",
      inquiryValidationDetails(validation.error),
    );
  }

  try {
    const confirmation = await createContextualInquiry(
      getRuntimeDatabase(),
      validation.data,
    );
    if (!confirmation) {
      return apiErrorResponse(404, "NOT_FOUND", "Inquiry source not available.");
    }
    return Response.json(confirmation, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unable to submit the employer inquiry.", error);
    return apiErrorResponse(
      500,
      "INTERNAL_ERROR",
      "The inquiry could not be submitted right now.",
    );
  }
}

function payloadTooLarge() {
  return apiErrorResponse(
    413,
    "PAYLOAD_TOO_LARGE",
    "Inquiry request is too large.",
  );
}
