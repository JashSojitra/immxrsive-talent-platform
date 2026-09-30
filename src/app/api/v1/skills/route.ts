import { getFilterMetadata } from "@/db/queries/talent";
import { getRuntimeDatabase } from "@/db/runtime";
import { apiErrorResponse } from "@/lib/api-errors";

export async function GET() {
  try {
    const metadata = await getFilterMetadata(getRuntimeDatabase());

    return Response.json(metadata, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unable to load filter metadata.", error);
    return apiErrorResponse(
      500,
      "INTERNAL_ERROR",
      "Filter metadata is temporarily unavailable.",
    );
  }
}
