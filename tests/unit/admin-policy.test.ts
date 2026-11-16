import { describe, expect, test, vi } from "vitest";
import { accessCommandSchema, adminCommandSchema, adminContentSchema, canManage, emptyContent, publicationIssues, safeAdminUrl } from "@/admin/policy";
import { adminGitHubSuggestions } from "@/admin/github";
import { projectPresentation } from "@/admin/public";
const content = { ...emptyContent, title: "Synthetic XR", summary: "Summary", description: "Narrative", fallbackText: "Alternative narrative", credits: [{ name: "Descriptive contributor", role: "Designer", statement: "Created visuals", profileId: "" }] };
describe("administrator validation and zero student gates", () => {
  test("manual credits and direct static publication need no student identity", () => {
    expect(adminContentSchema.parse(content).credits[0].profileId).toBe("");
    expect(publicationIssues(content)).toEqual([]);
    const result = projectPresentation("canonical", content);
    expect(result.contributors[0]).toMatchObject({ name: "Descriptive contributor", profileUrl: "" });
    expect(JSON.stringify(result)).not.toContain("profileId");
  });
  test.each(["actor", "actorUserId", "role", "ownerUserId", "managementMode", "consent", "approved"])("rejects forged %s", field => {
    expect(adminCommandSchema.safeParse({ action: "publish", version: 1, [field]: "forged" }).success).toBe(false);
    expect(adminContentSchema.safeParse({ ...content, [field]: "forged" }).success).toBe(false);
    expect(accessCommandSchema.safeParse({ subject: "u", role: "xr_admin", expectedRole: null, reason: "test", [field]: "forged" }).success).toBe(false);
  });
  test.each(["http://example.com", "javascript:alert(1)", "data:text/html,test", "https://127.0.0.1", "https://[::1]", "https://user:pass@example.com", "https://foo.internal", "https://127.0.0.1.nip.io", "<iframe src=https://example.com>"])("rejects unsafe demo %s", liveUrl => {
    expect(safeAdminUrl(liveUrl)).toBeNull(); expect(adminContentSchema.safeParse({ ...content, liveUrl }).success).toBe(false);
  });
  test("curators read only; administrators can manage", () => {
    expect(canManage(null)).toBe(false); expect(canManage("xr_curator")).toBe(false); expect(canManage("xr_admin")).toBe(true); expect(canManage("platform_super_admin")).toBe(true);
  });
  test.each(["2026-13-01", "2026-02-30", "2026-00-00", "0000-01-01"])("invalid dates fail validation without exceptions: %s", startDate => expect(adminContentSchema.safeParse({ ...content, startDate }).success).toBe(false));
  test("mode-specific technical validation and accessible media", () => {
    expect(publicationIssues({ ...content, demoMode: "native" })).toHaveLength(1);
    expect(publicationIssues({ ...content, demoMode: "embed" })).toHaveLength(1);
    expect(publicationIssues({ ...content, demoMode: "video" })).toHaveLength(1);
    expect(adminContentSchema.safeParse({ ...content, thumbnail: "https://example.com/image.png" }).success).toBe(false);
    expect(adminContentSchema.safeParse({ ...content, videoUrl: "https://example.com/movie.mp4" }).success).toBe(false);
  });
  test.each(["unpublish", "archive", "restore"])("%s operates only on saved content", action => {
    expect(adminCommandSchema.safeParse({ action, version: 1, content }).success).toBe(false);
    expect(adminCommandSchema.safeParse({ action, version: 1 }).success).toBe(true);
  });
  test.each(["nip.io", "sslip.io", "localtest.me", "lvh.me"])("rejects absolute DNS resolver hostnames: %s", host => {
    expect(safeAdminUrl(`https://127.0.0.1.${host}./demo`)).toBeNull();
  });
});
const metadata = { private: false, name: "Example", description: "Public evidence", html_url: "https://github.com/demo/repo", language: "TypeScript", homepage: "https://example.com/demo", updated_at: "2026-11-16T00:00:00Z" };
const fetcher = (data: unknown = metadata, languages: unknown = { TypeScript: 100 }) => vi.fn().mockImplementation(async (url: string) => Response.json(url.endsWith("/languages") ? languages : data));
describe("bounded public GitHub suggestions", () => {
  test("normalizes identity and uses fixed endpoints without credentials or redirects", async () => {
    const fetch = fetcher(); const result = await adminGitHubSuggestions("https://github.com/Demo/Repo.git", fetch);
    expect(result).toMatchObject({ originalRepository: "https://github.com/demo/repo", liveUrl: "https://example.com/demo", technologies: ["TypeScript"] });
    expect(fetch).toHaveBeenCalledTimes(2); expect(fetch.mock.calls[0][0]).toBe("https://api.github.com/repos/demo/repo"); expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: "error", cache: "no-store" }); expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
  test.each(["https://github.com.evil.test/demo/repo", "https://github.com@evil.test/demo/repo", "https://github.com:443/demo/repo", "https://github.com/demo/repo/tree/main", "https://github.com/demo/%2e%2e", "file:///etc/passwd"])("rejects unsafe repository before fetching: %s", async url => {
    const fetch = fetcher(); await expect(adminGitHubSuggestions(url, fetch)).rejects.toMatchObject({ code: "INVALID_REPOSITORY" }); expect(fetch).not.toHaveBeenCalled();
  });
  test.each([[404, "REPOSITORY_UNAVAILABLE"], [403, "GITHUB_RATE_LIMIT"], [429, "GITHUB_RATE_LIMIT"], [503, "GITHUB_UNAVAILABLE"]])("maps upstream %s", async (status, code) => await expect(adminGitHubSuggestions("https://github.com/demo/repo", vi.fn().mockResolvedValue(new Response("", { status: Number(status) })))).rejects.toMatchObject({ code }));
  test("private repos, oversized responses and identity changes fail safely", async () => {
    for (const data of [{ ...metadata, private: true }, { ...metadata, html_url: "https://github.com/other/repo" }, { ...metadata, description: "x".repeat(140000) }]) await expect(adminGitHubSuggestions("https://github.com/demo/repo", fetcher(data))).rejects.toMatchObject({ code: "GITHUB_UNAVAILABLE" });
  });
  test("ignores unsafe homepage and does not infer frameworks", async () => {
    expect(await adminGitHubSuggestions("https://github.com/demo/repo", fetcher({ ...metadata, homepage: "http://127.0.0.1" }, { JavaScript: 10 }))).toMatchObject({ liveUrl: "", technologies: ["TypeScript", "JavaScript"] });
  });
  test("timeout aborts upstream I/O", async () => {
    const fetch = vi.fn().mockImplementation((_url, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted")))));
    await expect(adminGitHubSuggestions("https://github.com/demo/repo", fetch, 5)).rejects.toMatchObject({ code: "GITHUB_TIMEOUT" });
  });
});
