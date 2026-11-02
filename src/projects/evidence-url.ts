export const DEMO_FIXTURE = "/fixtures/r3/working_demo.html";
export const FALLBACK_FIXTURE = "/fixtures/r3/fallback.svg";
// The only relative evidence paths are immutable, reviewed course fixtures.
export function safeEvidenceUrl(value: string): string | null {
  if ([DEMO_FIXTURE, FALLBACK_FIXTURE].includes(value)) return value;
  try {
    if (value.length > 2048 || /[\s\\]/.test(value)) return null;
    const url = new URL(value); const host = url.hostname.toLowerCase().replace(/\.+$/, "");
    if (url.protocol !== "https:" || url.username || url.password || url.port || !host.includes(".")
      || host.startsWith("[") || /^\d+(\.\d+)*$/.test(host)
      || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) return null;
    return url.href;
  } catch { return null; }
}

export function mayEmbedDemo(value: string, applicationOrigin: string): boolean {
  const safe = safeEvidenceUrl(value); if (!safe) return false;
  if (safe === DEMO_FIXTURE) return true;
  try {
    const target = new URL(safe, applicationOrigin);
    if (target.origin === applicationOrigin) return target.pathname === DEMO_FIXTURE;
    return target.hostname.endsWith(".github.io") || target.hostname === "html-classic.itch.zone";
  } catch { return false; }
}
