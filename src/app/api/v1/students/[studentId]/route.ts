import { queryPublicStudentProfile } from "@/db/queries/student-profile";
import { getRuntimeDatabase } from "@/db/runtime";
import { apiErrorResponse } from "@/lib/api-errors";

type RouteContext = { params: Promise<{ studentId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { studentId } = await params;

  try {
    const profile = await queryPublicStudentProfile(getRuntimeDatabase(), studentId);
    if (!profile) {
      return apiErrorResponse(
        404,
        "NOT_FOUND",
        "Student profile not available.",
      );
    }

    return Response.json(profile, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unable to load the public student profile.", error);
    return apiErrorResponse(
      500,
      "INTERNAL_ERROR",
      "The student profile is temporarily unavailable.",
    );
  }
}
