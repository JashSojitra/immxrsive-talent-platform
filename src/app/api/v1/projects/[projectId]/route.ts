import { queryPublicProject } from "@/db/queries/project-detail";
import { getRuntimeDatabase } from "@/db/runtime";
import { apiErrorResponse } from "@/lib/api-errors";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { projectId } = await params;

  try {
    const project = await queryPublicProject(getRuntimeDatabase(), projectId);
    if (!project) {
      return apiErrorResponse(404, "NOT_FOUND", "Project not available.");
    }

    return Response.json(project, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unable to load the public project.", error);
    return apiErrorResponse(
      500,
      "INTERNAL_ERROR",
      "The project is temporarily unavailable.",
    );
  }
}
