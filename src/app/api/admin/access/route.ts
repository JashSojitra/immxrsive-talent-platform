import { handleAdmin } from "@/admin/http";
export async function GET(request: Request) { return handleAdmin(request, "access"); }
export async function POST(request: Request) { return handleAdmin(request, "access"); }
