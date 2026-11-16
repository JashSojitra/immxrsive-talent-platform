import { handleAdmin } from "@/admin/http";
export async function POST(request: Request) { return handleAdmin(request, "duplicates"); }
