// Deliberately accepts repository pages only, never branch/file/API URLs.
export function githubRepository(value: string) {
  const raw = value.trim();
  if (raw.length > 2048 || !/^https:\/\/github\.com\//i.test(raw) || /[\\\s%]/.test(raw)) throw new Error("Use an HTTPS github.com/owner/repository URL.");
  const url = new URL(raw);
  // URL.port drops explicit :443, so the authority is also checked literally.
  if (!/^https:\/\/github\.com\//i.test(raw) || url.hostname !== "github.com" || url.username || url.password || url.port) throw new Error("Use a public GitHub repository URL without credentials or ports.");
  if (url.pathname !== raw.slice(raw.indexOf("/", 8)).split(/[?#]/, 1)[0]) throw new Error("Path normalization is not allowed.");
  const parts = url.pathname.replace(/\/$/, "").split("/");
  if (parts.length !== 3 || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(parts[1])) throw new Error("Enter a repository page, not a branch or file URL.");
  const repo = parts[2].replace(/\.git$/i, "");
  if (!/^[a-z\d_.-]{1,100}$/i.test(repo) || [".", ".."].includes(repo)) throw new Error("Enter a valid repository name.");
  const owner = parts[1].toLowerCase();
  return { owner, repo: repo.toLowerCase(), key: `https://github.com/${owner}/${repo.toLowerCase()}` };
}
