import { teamHandlers } from "@/projects/team-http";
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  return teamHandlers(request, "team", (await params).projectId);
}
