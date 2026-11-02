import { z } from "zod";
import { githubRepository } from "./repository-url";

export class GitHubImportError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) { super(message); }
}
const metadata = z.object({ private: z.literal(false), name: z.string().min(1).max(160), description: z.string().max(2000).nullable(), html_url: z.string(), language: z.string().max(80).nullable() });
export async function importGitHubRepository(value: string, fetcher: typeof fetch = fetch, timeout = 5000) {
  let repo: ReturnType<typeof githubRepository>;
  try { repo = githubRepository(value); } catch { throw new GitHubImportError("INVALID_REPOSITORY", 422, "Use an HTTPS github.com/owner/repository URL without credentials, ports or file paths."); }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  async function json(path: string) {
    // Never follow upstream-supplied URLs, redirects, README content, or tokens.
    const response = await fetcher(`https://api.github.com/repos/${repo.owner}/${repo.repo}${path}`, { signal: controller.signal, redirect: "error", cache: "no-store", headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ImmXrsive-Public-Project-Import" } });
    if (response.status === 404 || response.status === 401) throw new GitHubImportError("REPOSITORY_UNAVAILABLE", 404, "This public repository could not be found. Continue manually or check its URL.");
    if (response.status === 403 || response.status === 429) throw new GitHubImportError("GITHUB_RATE_LIMIT", 429, "GitHub is limiting requests. Your manual project fields are still available.");
    if (!response.ok || response.redirected) throw new Error("Upstream unavailable");
    const reader = response.body?.getReader(); if (!reader) throw new Error("Missing body");
    let size = 0; const chunks: Uint8Array[] = [];
    try {
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength;
        if (size > 131072) { await reader.cancel(); throw new Error("Response exceeds bound"); } chunks.push(value); }
    } finally { reader.releaseLock(); }
    const data = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(data)) as unknown;
  }
  try {
    const info = metadata.parse(await json(""));
    const canonical = githubRepository(info.html_url);
    // Renamed repositories redirect and fail safely; never follow metadata URLs.
    if (canonical.key !== repo.key) throw new Error("Repository identity changed");
    const languages = z.record(z.string().min(1).max(80), z.number().nonnegative()).parse(await json("/languages"));
    const technologies = [...new Set([...(info.language ? [info.language] : []), ...Object.entries(languages).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).map(([name]) => name)])].slice(0, 20);
    return { title: info.name, description: info.description ?? "", repositoryUrl: canonical.key, technologies };
  } catch (error) {
    if (error instanceof GitHubImportError) throw error;
    throw new GitHubImportError(controller.signal.aborted ? "GITHUB_TIMEOUT" : "GITHUB_UNAVAILABLE", 502, "GitHub suggestions are unavailable. Your manual project fields are unchanged; try again or continue manually.");
  } finally { clearTimeout(timer); }
}
