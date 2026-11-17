import { handleStudio } from "@/studio/http";
export const GET = (request: Request) => handleStudio(request);
