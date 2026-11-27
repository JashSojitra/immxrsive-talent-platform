import { z } from "zod";
export const screenshotTextSchema = z.object({ altText: z.string().trim().min(1, "Describe the screenshot.").max(300), caption: z.string().trim().max(300).default("") }).strict();
export const screenshotUpdateSchema = z.object({ revision: z.string().regex(/^[a-f0-9]{64}$/), screenshots: z.array(screenshotTextSchema.extend({ id: z.uuid() })).max(10) }).strict();
export type Screenshot = { id: string; url: string; altText: string; caption: string };
export type ScreenshotState = { screenshots: Screenshot[]; revision: string };
