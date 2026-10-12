import { requireAuthenticatedRequestUser } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import { verificationErrorResponse } from "@/verification/http";
import { getStudentVerificationStatus } from "@/verification/service";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedRequestUser(request);
    const result = await getStudentVerificationStatus(
      getRuntimeDatabase(),
      user.id,
    );
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return verificationErrorResponse(error);
  }
}
