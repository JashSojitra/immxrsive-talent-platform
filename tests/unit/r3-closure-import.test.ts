import { describe, expect, test, vi } from "vitest";
import { importGitHubRepository } from "@/projects/github-import";
import { githubRepository } from "@/projects/repository-url";
import { projectDraftSchema } from "@/projects/validation";
import { mayEmbedDemo } from "@/projects/evidence-url";

// Exact reported identity; response contents are synthetic, never live evidence.
const repository = "https://github.com/JashSojitra/immxrsive-talent-platform";
const canonical = "https://github.com/jashsojitra/immxrsive-talent-platform";
const playable = "https://immxrsive-talent-platform.vercel.app/";
const info = { private: false, name: "immxrsive-talent-platform", description: null,
  html_url: repository, language: "TypeScript" };
const api = "https://api.github.com/repos/jashsojitra/immxrsive-talent-platform";

describe("R3 closure exact reported repository (deterministic)", () => {
  test("mixed-case GitHub identity and supplied playable remain independent valid fields", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(info))
      .mockResolvedValueOnce(Response.json({ TypeScript: 900, CSS: 100 }));
    const suggestions = await importGitHubRepository(repository, fetcher);
    expect(suggestions).toEqual({ title: info.name, description: "", repositoryUrl: canonical,
      technologies: ["TypeScript", "CSS"] });
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([api, `${api}/languages`]);
    expect(githubRepository(`${repository}.git/?tab=readme#top`).key).toBe(canonical);
    const draft = projectDraftSchema.parse({
      title: suggestions.title, description: suggestions.description, domain: "Web",
      technologies: suggestions.technologies, repositories: [{ url: suggestions.repositoryUrl }],
      media: [{ kind: "playable", label: "Platform", url: playable }] });
    expect(draft.media[0].url).toBe(playable);
    expect(draft.repositories[0].url).toBe(canonical);
    expect(mayEmbedDemo(playable, playable)).toBe(false);
  });
  test.each(["metadata", "languages"])("handles failures at the %s stage", async stage => {
    for (const [status, code] of [[401, "REPOSITORY_UNAVAILABLE"], [404, "REPOSITORY_UNAVAILABLE"],
      [403, "GITHUB_RATE_LIMIT"], [429, "GITHUB_RATE_LIMIT"], [500, "GITHUB_UNAVAILABLE"],
      [302, "GITHUB_UNAVAILABLE"]] as const) {
      const fetcher = vi.fn();
      if (stage === "languages") fetcher.mockResolvedValueOnce(Response.json(info));
      fetcher.mockResolvedValueOnce(Response.json({ message: "Synthetic upstream failure" }, { status }));
      await expect(importGitHubRepository(repository, fetcher)).rejects.toMatchObject({ code });
      expect(fetcher.mock.calls[0][0]).toBe(api);
    }
  });
  test("rejects private, changed-identity, malformed metadata and malformed language responses", async () => {
    for (const body of [{ ...info, private: true }, { ...info, html_url: `${repository}-renamed` },
      { ...info, description: 42 }]) {
      await expect(importGitHubRepository(repository, vi.fn().mockResolvedValue(Response.json(body))))
        .rejects.toMatchObject({ code: "GITHUB_UNAVAILABLE" });
    }
    for (const body of [{ TypeScript: -1 }, { TypeScript: "900" }]) {
      await expect(importGitHubRepository(repository, vi.fn().mockResolvedValueOnce(Response.json(info))
        .mockResolvedValueOnce(Response.json(body)))).rejects.toMatchObject({ code: "GITHUB_UNAVAILABLE" });
    }
    await expect(importGitHubRepository(repository, vi.fn().mockResolvedValue(new Response("<html>gateway error</html>"))))
      .rejects.toMatchObject({ code: "GITHUB_UNAVAILABLE" });
  });
  test("a languages timeout and a transport rejection are recoverable import errors", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(info)).mockImplementationOnce(
      (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted")))));
    await expect(importGitHubRepository(repository, fetcher, 10)).rejects.toMatchObject({ code: "GITHUB_TIMEOUT" });
    await expect(importGitHubRepository(repository, vi.fn().mockRejectedValue(new Error("network"))))
      .rejects.toMatchObject({ code: "GITHUB_UNAVAILABLE" });
  });
});
