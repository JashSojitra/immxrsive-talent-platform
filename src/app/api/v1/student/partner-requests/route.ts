import { handlePartner } from "@/partners/http";
export async function GET(r:Request) { return handlePartner(r,"requests",true); }
export async function POST(r:Request) { return handlePartner(r,"requests",true); }
