import { describe, expect, test } from "vitest";
import { contributionSchema, projectDraftSchema, publicProjectUrl, repositoryKey } from "@/projects/validation";

const draft = { title: "Shared project", description: "Description", domain: "XR" };
describe("shared project input boundaries", () => {
  test("zero repositories and unknown dates remain valid", () => {
    expect(projectDraftSchema.parse(draft)).toMatchObject({ repositories: [], projectDate: null, projectStatus: "in_progress" });
  });
  test.each(["http://github.com/org/repo", "https://localhost/demo", "https://localhost./demo", "https://127.0.0.1/demo", "https://[::1]/", "https://internal/demo", "https://host.local/demo", "https://user:secret@example.com/", "https://example.com:8443/", "javascript:alert(1)", "<iframe src='https://example.com'>"])("rejects unsafe URL %s", url => {
    expect(publicProjectUrl.safeParse(url).success).toBe(false);
  });
  test("normalizes GitHub keys independently from a permanent project ID", () => {
    expect(repositoryKey("https://GitHub.com/ORG/Repo.git/?tab=readme#top")).toBe("https://github.com/org/repo");
    expect(projectDraftSchema.safeParse({ ...draft, repositories: [{ url: "https://github.com/org/repo" }, { url: "https://github.com/ORG/REPO.git" }] }).success).toBe(false);
  });
  test("allows multiple distinct repositories and distinct media types", () => {
    expect(projectDraftSchema.parse({ ...draft, repositories: [{ url: "https://github.com/org/a" }, { url: "https://github.com/org/b" }], media: ["playable", "video", "source", "fallback_image", "fallback_video", "fallback_link"].map(kind => ({ kind, label: kind, url: "https://example.com/evidence" })) }).media).toHaveLength(6);
  });
  test("rejects ownership, arbitrary HTML fields, duplicate primary media and invalid dates", () => {
    for (const extra of [{ maintainerUserId: "forged" }, { iframe: "<iframe>" }, { projectDate: "2026-02-30" }, { media: [1, 2].map(() => ({ kind: "playable", label: "Play", url: "https://example.com/" })) }]) expect(projectDraftSchema.safeParse({ ...draft, ...extra }).success).toBe(false);
    expect(contributionSchema.safeParse({ roleId: "xr-developer", statement: "Own statement", featured: true, publicVisible: true, profileId: "forged" }).success).toBe(false);
  });
});
