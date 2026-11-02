import { teamHandlers } from "@/projects/team-http";
export async function POST(request: Request, { params }: { params: Promise<{ transferId: string }> }) {
  return teamHandlers(request, "transfer", (await params).transferId);
}
