import { importHandlers } from "@/projects/import-http";
export async function GET(request: Request) { return importHandlers(request, "requests"); }
