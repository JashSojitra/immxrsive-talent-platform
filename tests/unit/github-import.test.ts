import { describe, expect, test, vi } from "vitest";
import { githubRepository } from "@/projects/repository-url";
import { importGitHubRepository } from "@/projects/github-import";
import { repositoryKey } from "@/projects/validation";
const info = { name: "xr-studio", description: "Public XR work", private: false, html_url: "https://github.com/qa/xr-studio", language: "TypeScript" };
describe("bounded public GitHub import", () => {
  test.each(["https://GitHub.com/QA/XR-Studio.git/?tab=readme#top", "https://github.com/qa/xr-studio"])("normalizes identity %s", url => {
    expect(githubRepository(url).key).toBe("https://github.com/qa/xr-studio"); expect(repositoryKey(url)).toBe("https://github.com/qa/xr-studio");
  });
  test.each(["http://github.com/a/b", "https://github.com:443/a/b", "https://github.com.evil.com/a/b", "https://github.com@evil.com/a/b", "https://user:pw@github.com/a/b", "https://github.com./a/b", "https://github.com/a/b/tree/main", "https://github.com/a/b%2fsecret", "https://github.com/a/%252f", "https://github.com/a/b/../c", "https://github.com/a/b\\c", "https://api.github.com/repos/a/b", "https://127.0.0.1/a/b", "https://github.com/a/..", "https://github.com/a/b//"])("rejects unsafe repository %s", async url => {
    const fetcher = vi.fn(); expect(() => githubRepository(url)).toThrow(); await expect(importGitHubRepository(url, fetcher)).rejects.toMatchObject({ code: "INVALID_REPOSITORY" }); expect(fetcher).not.toHaveBeenCalled();
  });
  test("uses two fixed unauthenticated routes and returns editable language suggestions only", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(info)).mockResolvedValueOnce(Response.json({ TypeScript: 90, CSS: 10 }));
    expect(await importGitHubRepository(info.html_url, fetcher)).toEqual({ title: info.name, description: info.description, repositoryUrl: info.html_url, technologies: ["TypeScript", "CSS"] });
    expect(fetcher.mock.calls.map(c => c[0])).toEqual(["https://api.github.com/repos/qa/xr-studio", "https://api.github.com/repos/qa/xr-studio/languages"]);
    for (const [,options] of fetcher.mock.calls) { expect(options.redirect).toBe("error"); expect(options.headers).not.toHaveProperty("Authorization"); }
  });
  test.each([[404,"REPOSITORY_UNAVAILABLE"],[401,"REPOSITORY_UNAVAILABLE"],[403,"GITHUB_RATE_LIMIT"],[429,"GITHUB_RATE_LIMIT"],[500,"GITHUB_UNAVAILABLE"],[302,"GITHUB_UNAVAILABLE"]])("handles upstream status %s", async (status, code) => {
    await expect(importGitHubRepository(info.html_url, vi.fn().mockResolvedValue(new Response("", { status: Number(status) })))).rejects.toMatchObject({ code });
  });
  test("private/mismatched/malformed and oversized responses cannot leak or escape the fixed upstream", async () => {
    for (const data of [{ ...info, private: true }, { ...info, html_url: "https://evil.com/a/b" }, { token: "secret" }]) await expect(importGitHubRepository(info.html_url, vi.fn().mockResolvedValue(Response.json(data)))).rejects.toMatchObject({ code: "GITHUB_UNAVAILABLE" });
    await expect(importGitHubRepository(info.html_url, vi.fn().mockResolvedValue(new Response("x".repeat(131073))))).rejects.toMatchObject({ code: "GITHUB_UNAVAILABLE" });
  });
  test("times out within its own abort budget", async () => {
    const fetcher: typeof fetch = vi.fn((_url, init) => new Promise<Response>((_resolve,reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))));
    await expect(importGitHubRepository(info.html_url, fetcher, 10)).rejects.toMatchObject({ code: "GITHUB_TIMEOUT" });
  });
});
