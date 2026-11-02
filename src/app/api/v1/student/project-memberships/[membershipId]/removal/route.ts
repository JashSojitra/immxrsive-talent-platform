import { teamHandlers } from "@/projects/team-http";
export async function POST(request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  return teamHandlers(request, "removal", (await params).membershipId);
}
