import { z } from "zod";
import { requireVerifiedRequestStudent } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import { readBody, errorResponse, type Dependencies } from "./http";
import { contributionSchema } from "./validation";
import { findEligibleTeammates, getProjectTeam, inviteContributor, listProjectRelationships, offerMaintainerTransfer,
  respondToInvitation, respondToMaintainerTransfer, setMembershipRemoved, updateContribution } from "./service";

const version = z.number().int().positive();
const schemas = {
  invite: z.object({ version, profileId: z.uuid(), roleId: z.string().min(1).max(80) }).strict(),
  response: z.object({ version, accept: z.boolean() }).strict(),
  contribution: z.object({ version, contribution: contributionSchema }).strict(),
  removal: z.object({ version, reason: z.string().trim().max(500).optional() }).strict(),
  restore: z.object({ version }).strict(),
  offer: z.object({ version, targetMembershipId: z.uuid() }).strict(),
  transfer: z.object({ accept: z.boolean() }).strict(),
};
export type TeamAction = "team" | "inbox" | "candidates" | keyof typeof schemas;

export function createTeamHandlers(deps: Dependencies) {
  return async (request: Request, action: TeamAction, id = "") => {
    try {
      const { user } = await deps.authorize(request);
      const ctx = { db: deps.database(), actorUserId: user.id };
      let result: unknown;
      if (action === "team") result = await getProjectTeam({ ...ctx, projectId: id });
      else if (action === "inbox") result = { projects: await listProjectRelationships(ctx) };
      else if (action === "candidates") result = { students: await findEligibleTeammates({ ...ctx, projectId: id, query: new URL(request.url).searchParams.get("q") ?? "" }) };
      else {
        const body = await readBody(request, deps.applicationOrigin);
        switch (action) {
          case "invite": result = await inviteContributor({ ...ctx, projectId: id, ...schemas.invite.parse(body) }); break;
          case "response": result = await respondToInvitation({ ...ctx, membershipId: id, ...schemas.response.parse(body) }); break;
          case "contribution": result = await updateContribution({ ...ctx, membershipId: id, ...schemas.contribution.parse(body) }); break;
          case "removal": result = await setMembershipRemoved({ ...ctx, membershipId: id, removed: true, ...schemas.removal.parse(body) }); break;
          case "restore": result = await setMembershipRemoved({ ...ctx, membershipId: id, removed: false, ...schemas.restore.parse(body) }); break;
          case "offer": result = await offerMaintainerTransfer({ ...ctx, projectId: id, ...schemas.offer.parse(body) }); break;
          case "transfer": result = await respondToMaintainerTransfer({ ...ctx, transferId: id, ...schemas.transfer.parse(body) }); break;
        }
        // Domain rows contain server-owned metadata; mutations return only an
        // acknowledgement. Clients reload their authorized, allowlisted team DTO.
        result = { ok: Boolean(result) };
      }
      return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      const response = errorResponse(error);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  };
}
export const teamHandlers = createTeamHandlers({ authorize: requireVerifiedRequestStudent, database: getRuntimeDatabase,
  applicationOrigin: process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : undefined });
