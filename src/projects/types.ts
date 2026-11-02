import type { ProjectDraft } from "./validation";
export type ProjectEditorData = {
  project: { id: string; version: number; publicationStatus: "published" | "unpublished" };
  draft: ProjectDraft;
};
export type ProjectRoleOption = { id: string; name: string };
