import { requireAuthenticatedRequestUser } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import {
  getConfiguredVerificationMailer,
  type VerificationMailer,
} from "@/email/affiliation-verification";
import { apiErrorResponse } from "@/lib/api-errors";
import { getAffiliationVerificationConfig } from "@/verification/config";
import { readVerificationJson, verificationErrorResponse } from "@/verification/http";
import { requestAffiliationVerification } from "@/verification/service";
import { verificationRequestSchema } from "@/verification/validation";

type RequestDependencies = {
  authenticate: (request: Request) => Promise<{ id: string }>;
  database: typeof getRuntimeDatabase;
  mailer: () => VerificationMailer | null;
};

export function createVerificationRequestHandler(dependencies: RequestDependencies) {
  return async function POST(request: Request) {
    try {
      const user = await dependencies.authenticate(request);
      const body = await readVerificationJson(request);
      const validation = verificationRequestSchema.safeParse(body);
      if (!validation.success) {
        return apiErrorResponse(
          422,
          "VALIDATION_ERROR",
          "Enter a valid university email address.",
        );
      }
      const mailer = dependencies.mailer();
      if (!mailer) {
        return apiErrorResponse(
          503,
          "EMAIL_NOT_CONFIGURED",
          "Email delivery is not configured in this environment.",
        );
      }
      const result = await requestAffiliationVerification({
        db: dependencies.database(),
        userId: user.id,
        email: validation.data.email,
        mailer,
        config: getAffiliationVerificationConfig(),
      });
      return Response.json(result, {
        status: 202,
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      return verificationErrorResponse(error);
    }
  };
}

export const POST = createVerificationRequestHandler({
  authenticate: requireAuthenticatedRequestUser,
  database: getRuntimeDatabase,
  mailer: getConfiguredVerificationMailer,
});
