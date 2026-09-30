import { getFilterMetadata, queryTalentDirectory } from "@/db/queries/talent";
import { getRuntimeDatabase } from "@/db/runtime";
import { apiErrorResponse } from "@/lib/api-errors";
import {
  parseTalentQuery,
  TalentQueryValidationError,
} from "@/validation/talent-query";

export async function GET(request: Request) {
  try {
    const db = getRuntimeDatabase();
    const metadata = await getFilterMetadata(db);
    const query = parseTalentQuery(
      new URL(request.url).searchParams,
      new Set(metadata.skills.map((skill) => skill.value)),
    );
    const response = await queryTalentDirectory(db, query);

    return Response.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof TalentQueryValidationError) {
      return apiErrorResponse(
        400,
        "INVALID_QUERY",
        error.message,
        error.details,
      );
    }

    console.error("Unable to load the public talent directory.", error);
    return apiErrorResponse(
      500,
      "INTERNAL_ERROR",
      "The talent directory is temporarily unavailable.",
    );
  }
}
