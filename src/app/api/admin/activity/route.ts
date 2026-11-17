import { handleAdmin } from "@/admin/http";
export async function GET(request: Request) { return handleAdmin(request, "activity"); }
