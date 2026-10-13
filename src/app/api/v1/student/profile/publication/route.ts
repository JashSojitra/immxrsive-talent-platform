import { requireVerifiedRequestStudent } from "@/auth/server";
import type { Database } from "@/db/client";
import { getRuntimeDatabase } from "@/db/runtime";
import { apiErrorResponse } from "@/lib/api-errors";
import { readStudentProfileJson, studentProfileErrorResponse } from "@/profile/http";
import { changeProfilePublication } from "@/profile/service";
import { publicationChangeSchema, studentProfileValidationDetails } from "@/validation/student-profile";

type PublicationDependencies = {
  authorize: (request: Request) => Promise<{ user: { id: string } }>;
  database: () => Database;
};

export function createPublicationHandler(dependencies: PublicationDependencies) {
  return async (request: Request) => {
    try {
      const { user } = await dependencies.authorize(request);
      const validation = publicationChangeSchema.safeParse(await readStudentProfileJson(request));
      if (!validation.success) {
        return apiErrorResponse(422, "VALIDATION_ERROR", "Review the publication request.",
          studentProfileValidationDetails(validation.error));
      }
      const profile = await changeProfilePublication({
        db: dependencies.database(),
        ownerUserId: user.id,
        ...validation.data,
      });
      return Response.json({ profile }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch (error) {
      return studentProfileErrorResponse(error);
    }
  };
}

export const POST = createPublicationHandler({
  authorize: requireVerifiedRequestStudent,
  database: getRuntimeDatabase,
});
