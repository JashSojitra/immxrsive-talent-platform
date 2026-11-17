import { handlePartner } from "@/partners/http";
export const runtime = "nodejs";
type Context = { params: Promise<{action:string}> };
export async function GET(r:Request,c:Context) { return handlePartner(r,(await c.params).action); }
export async function POST(r:Request,c:Context) { return handlePartner(r,(await c.params).action); }
