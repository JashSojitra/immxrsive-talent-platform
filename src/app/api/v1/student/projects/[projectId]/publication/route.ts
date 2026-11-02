import { projectHandlers } from "@/projects/http";
export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) { return projectHandlers.publication(request, (await context.params).projectId); }
