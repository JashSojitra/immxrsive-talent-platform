import { importHandlers } from "@/projects/import-http";
export async function POST(request: Request, { params }: { params: Promise<{ joinRequestId: string }> }) { return importHandlers(request, "respond", (await params).joinRequestId); }
