import { teamHandlers } from "@/projects/team-http";
export function GET(request: Request) { return teamHandlers(request, "inbox"); }
