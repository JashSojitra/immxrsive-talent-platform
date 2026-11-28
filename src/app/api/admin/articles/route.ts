import { articleMutation } from "@/updates/http";
export const POST = (request: Request) => articleMutation(request);
