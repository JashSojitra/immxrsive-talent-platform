import { projectHandlers } from "@/projects/http";
type Context = { params: Promise<{ projectId: string }> };
export async function GET(request: Request, context: Context) { return projectHandlers.get(request, (await context.params).projectId); }
export async function PATCH(request: Request, context: Context) { return projectHandlers.edit(request, (await context.params).projectId); }
