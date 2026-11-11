import { handleStudio } from "@/studio/http";
type Context = { params: Promise<{ projectId: string }> };
export async function GET(request: Request, context: Context) { return handleStudio(request, (await context.params).projectId); }
export async function POST(request: Request, context: Context) { return handleStudio(request, (await context.params).projectId); }
