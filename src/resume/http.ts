import { apiErrorResponse } from "@/lib/api-errors";
import { ResumeExtractionError } from "@/resume/extract";

export function resumeErrorResponse(error: unknown) {
  if (error instanceof ResumeExtractionError) {
    return apiErrorResponse(error.status, error.code, error.message);
  }
  return apiErrorResponse(
    500,
    "RESUME_EXTRACTION_FAILED",
    "The resume could not be processed. Your profile has not changed.",
  );
}
