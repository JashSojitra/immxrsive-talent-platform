import { requireVerifiedRequestStudent } from "@/auth/server";
import type { Database } from "@/db/client";
import { getRuntimeDatabase } from "@/db/runtime";
import { apiErrorResponse } from "@/lib/api-errors";
import { studentProfileErrorResponse } from "@/profile/http";
import { getProfileEditorVocabulary } from "@/profile/service";
import {
  extractResumeCandidates,
  MAX_RESUME_BYTES,
  ResumeExtractionError,
} from "@/resume/extract";
import { resumeErrorResponse } from "@/resume/http";

type ResumeRouteDependencies = {
  authorize: (request: Request) => Promise<{ user: { id: string } }>;
  database: () => Database;
  extract: typeof extractResumeCandidates;
};

export function createResumeExtractionHandler(dependencies: ResumeRouteDependencies) {
  return async (request: Request) => {
    try {
      await dependencies.authorize(request);
      const declaredLength = Number(request.headers.get("content-length") ?? 0);
      if (declaredLength > MAX_RESUME_BYTES + 64 * 1024) {
        throw new ResumeExtractionError("PDF_TOO_LARGE", 413, "Resume PDFs must be 5 MB or smaller.");
      }
      if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
        return apiErrorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "Upload the resume as multipart form data.");
      }
      const form = await request.formData();
      const resume = form.get("resume");
      if (!(resume instanceof File)) {
        return apiErrorResponse(400, "RESUME_REQUIRED", "Choose a PDF resume to continue.");
      }
      if (resume.size > MAX_RESUME_BYTES) {
        throw new ResumeExtractionError("PDF_TOO_LARGE", 413, "Resume PDFs must be 5 MB or smaller.");
      }
      if (resume.type && resume.type !== "application/pdf") {
        return apiErrorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "Only PDF resumes are supported.");
      }
      const vocabulary = await getProfileEditorVocabulary(dependencies.database());
      const candidates = await dependencies.extract(
        new Uint8Array(await resume.arrayBuffer()),
        vocabulary,
      );
      return Response.json({ candidates }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch (error) {
      const authResponse = studentProfileErrorResponse(error);
      if (authResponse.status !== 500) return authResponse;
      return resumeErrorResponse(error);
    }
  };
}

export const POST = createResumeExtractionHandler({
  authorize: requireVerifiedRequestStudent,
  database: getRuntimeDatabase,
  extract: extractResumeCandidates,
});
