import { requireVerifiedRequestStudent } from "@/auth/server";
import type { Database } from "@/db/client";
import { getRuntimeDatabase } from "@/db/runtime";
import { apiErrorResponse } from "@/lib/api-errors";
import { readStudentProfileJson, studentProfileErrorResponse } from "@/profile/http";
import {
  createPrivateStudentProfile,
  getPrivateStudentProfile,
  getProfileEditorVocabulary,
  updatePrivateStudentProfile,
} from "@/profile/service";
import {
  studentProfileDraftSchema,
  studentProfileValidationDetails,
} from "@/validation/student-profile";

type ProfileRouteDependencies = {
  authorize: (request: Request) => Promise<{ user: { id: string } }>;
  database: () => Database;
};

export function createStudentProfileHandlers(dependencies: ProfileRouteDependencies) {
  return {
    GET: async (request: Request) => {
      try {
        const { user } = await dependencies.authorize(request);
        const db = dependencies.database();
        const [profile, vocabulary] = await Promise.all([
          getPrivateStudentProfile(db, user.id),
          getProfileEditorVocabulary(db),
        ]);
        return Response.json({ profile, vocabulary }, {
          headers: { "Cache-Control": "private, no-store" },
        });
      } catch (error) {
        return studentProfileErrorResponse(error);
      }
    },
    POST: async (request: Request) => saveProfile(request, dependencies, "create"),
    PUT: async (request: Request) => saveProfile(request, dependencies, "update"),
  };
}

async function saveProfile(
  request: Request,
  dependencies: ProfileRouteDependencies,
  operation: "create" | "update",
) {
  try {
    const { user } = await dependencies.authorize(request);
    const body = await readStudentProfileJson(request);
    const validation = studentProfileDraftSchema.safeParse(body);
    if (!validation.success) {
      return apiErrorResponse(
        422,
        "VALIDATION_ERROR",
        "Review the highlighted profile fields.",
        studentProfileValidationDetails(validation.error),
      );
    }
    const profile = operation === "create"
      ? await createPrivateStudentProfile({
          db: dependencies.database(),
          ownerUserId: user.id,
          draft: validation.data,
        })
      : await updatePrivateStudentProfile({
          db: dependencies.database(),
          ownerUserId: user.id,
          draft: validation.data,
        });
    return Response.json({ profile }, {
      status: operation === "create" ? 201 : 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return studentProfileErrorResponse(error);
  }
}

const handlers = createStudentProfileHandlers({
  authorize: requireVerifiedRequestStudent,
  database: getRuntimeDatabase,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
