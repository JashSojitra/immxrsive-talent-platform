import { teamHandlers } from "@/projects/team-http";
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  return teamHandlers(request, "invite", (await params).projectId);
}
