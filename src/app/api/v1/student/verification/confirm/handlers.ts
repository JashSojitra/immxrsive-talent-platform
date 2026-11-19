import { requireAuthenticatedRequestUser } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import { apiErrorResponse } from "@/lib/api-errors";
import { getAffiliationVerificationConfig } from "@/verification/config";
import {
  clientAddressFromRequest,
  readVerificationJson,
  verificationErrorResponse,
} from "@/verification/http";
import { confirmAffiliationVerification } from "@/verification/service";
import { verificationConfirmationSchema } from "@/verification/validation";

type ConfirmDependencies = {
  authenticate: (request: Request) => Promise<{ id: string }>;
  database: typeof getRuntimeDatabase;
};

export function createVerificationConfirmHandler(dependencies: ConfirmDependencies) {
  return async function POST(request: Request) {
    try {
      const user = await dependencies.authenticate(request);
      const body = await readVerificationJson(request);
      const validation = verificationConfirmationSchema.safeParse(body);
      if (!validation.success) {
        return apiErrorResponse(
          422,
          "INVALID_TOKEN",
          "This verification link is invalid or no longer active.",
        );
      }
      const result = await confirmAffiliationVerification({
        db: dependencies.database(),
        userId: user.id,
        token: validation.data.token,
        clientAddress: clientAddressFromRequest(request),
        config: getAffiliationVerificationConfig(),
      });
      return Response.json(result, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      return verificationErrorResponse(error);
    }
  };
}

export const POST = createVerificationConfirmHandler({
  authenticate: requireAuthenticatedRequestUser,
  database: getRuntimeDatabase,
});
