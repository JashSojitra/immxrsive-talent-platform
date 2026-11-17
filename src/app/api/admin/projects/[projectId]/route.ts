import { handleAdmin } from "@/admin/http";
type Context = { params: Promise<{ projectId: string }> };
export async function GET(request: Request, context: Context) { return handleAdmin(request, "detail", (await context.params).projectId); }
export async function POST(request: Request, context: Context) { return handleAdmin(request, "command", (await context.params).projectId); }
