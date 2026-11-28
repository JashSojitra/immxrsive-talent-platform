import { getRuntimeDatabase } from "@/db/runtime";
import { worldUpdates } from "@/updates/world";
export const dynamic = "force-dynamic";
export async function GET() { return Response.json((await worldUpdates(getRuntimeDatabase())).volumes, { headers: { "Cache-Control": "public, max-age=0, must-revalidate" } }); }
