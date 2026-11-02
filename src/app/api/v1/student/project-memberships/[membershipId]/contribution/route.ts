import { teamHandlers } from "@/projects/team-http";
export async function PATCH(request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  return teamHandlers(request, "contribution", (await params).membershipId);
}
