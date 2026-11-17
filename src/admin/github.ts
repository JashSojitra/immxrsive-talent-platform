import { z } from "zod";
import { githubRepository } from "@/projects/repository-url";
import { GitHubImportError } from "@/projects/github-import";
import { safeAdminUrl } from "./policy";
const metadata = z.object({ private: z.literal(false), name: z.string().min(1).max(160), description: z.string().max(2000).nullable(), html_url: z.string(), language: z.string().max(80).nullable(), homepage: z.string().nullable().optional(), updated_at: z.string().max(80).optional() });
export async function adminGitHubSuggestions(value: string, fetcher: typeof fetch = fetch, timeout = 5000) {
  let repo: ReturnType<typeof githubRepository>;
  try { repo = githubRepository(value); } catch { throw new GitHubImportError("INVALID_REPOSITORY", 422, "Use an HTTPS github.com/owner/repository URL."); }
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
  async function json(suffix: string) {
    const response = await fetcher(`https://api.github.com/repos/${repo.owner}/${repo.repo}${suffix}`, { redirect: "error", cache: "no-store", signal: controller.signal, headers: { Accept: "application/vnd.github+json", "User-Agent": "ImmXrsive-Admin-Intake" } });
    if ([401, 404].includes(response.status)) throw new GitHubImportError("REPOSITORY_UNAVAILABLE", 404, "Public repository unavailable. Check the URL or continue manually.");
    if ([403, 429].includes(response.status)) throw new GitHubImportError("GITHUB_RATE_LIMIT", 429, "GitHub rate limit reached. Continue manually or retry later.");
    if (!response.ok || response.redirected) throw new Error("Upstream unavailable");
    const reader = response.body?.getReader(); if (!reader) throw new Error("Missing response");
    let bytes = 0; const chunks: Uint8Array[] = [];
    try {
      while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 131072) { await reader.cancel(); throw new Error("Oversized response"); } chunks.push(value); }
    } finally { reader.releaseLock(); }
    const result = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(result)) as unknown;
  }
  try {
    const info = metadata.parse(await json(""));
    if (githubRepository(info.html_url).key !== repo.key) throw new Error("Identity changed");
    const languages = z.record(z.string().min(1).max(80), z.number().nonnegative()).parse(await json("/languages"));
    return { title: info.name, summary: (info.description ?? "").slice(0, 600), description: info.description ?? "", originalRepository: repo.key, technologies: [...new Set([...(info.language ? [info.language] : []), ...Object.entries(languages).sort((a,b) => b[1] - a[1]).map(([name]) => name)])].slice(0, 30), liveUrl: info.homepage && safeAdminUrl(info.homepage) || "", updatedAt: info.updated_at ?? null };
  } catch (error) {
    if (error instanceof GitHubImportError) throw error;
    throw new GitHubImportError(controller.signal.aborted ? "GITHUB_TIMEOUT" : "GITHUB_UNAVAILABLE", 502, "GitHub suggestions unavailable. Continue manually; your fields are retained.");
  } finally { clearTimeout(timer); }
}
