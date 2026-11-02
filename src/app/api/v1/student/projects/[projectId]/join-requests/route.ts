import { importHandlers } from "@/projects/import-http";
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) { return importHandlers(request, "join", (await params).projectId); }
