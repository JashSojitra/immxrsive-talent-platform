import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { safeAdminUrl } from "@/admin/policy";
import { companyWebsiteUrl, normalizedDomain, type CompanyContent } from "./policy";

// Conservative IPv4-only allow-list. IPv6 is rejected rather than risking mapped,
// transition, link-local or implementation-specific address interpretations.
export function publicIPv4(address: string) {
  if (isIP(address) !== 4) return false;
  const [a,b] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && [0,168].includes(b) || a === 100 && b >= 64 && b <= 127 || a === 198 && [18,19,51].includes(b) || a === 203 && b === 0);
}
export async function fetchCompanyHtml(value: string): Promise<string> {
  if(!safeAdminUrl(value)) throw new Error("Use a public HTTPS source URL.");
  normalizedDomain(value);
  const url = new URL(value);
  if (url.port && url.port !== "443") throw new Error("Only standard HTTPS websites are supported.");
  let dnsTimer: ReturnType<typeof setTimeout> | undefined;
  const addresses = await Promise.race([lookup(url.hostname, { all: true }), new Promise<never>((_resolve,reject) => { dnsTimer = setTimeout(()=>reject(new Error("DNS lookup timed out.")),2000); })]).finally(()=>clearTimeout(dnsTimer));
  if (!addresses.length || addresses.some(a => !publicIPv4(a.address))) throw new Error("Website must resolve only to public IPv4 addresses.");
  // Pin validated DNS address at connection time, preserving TLS hostname validation.
  return new Promise((resolve, reject) => {
    const req = request(url, { method: "GET", agent: false, family: 4, lookup: (_host, _options, cb) => cb(null, addresses[0].address, 4), headers: { Accept: "text/html", "Accept-Encoding": "identity", "User-Agent": "ImmXrsive-Company-Proposal/1.0" } }, res => {
      if (res.statusCode !== 200 || !/^text\/html(?:;|$)/i.test(res.headers["content-type"] ?? "") || res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity") { res.destroy(); reject(new Error("Expected an HTML page (redirects are not followed).")); return; }
      const chunks: Buffer[] = []; let size = 0;
      res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > 512000) { const error = new Error("Website exceeds 500 KB."); reject(error); req.destroy(error); } else chunks.push(chunk); });
      res.on("error", reject);
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    const timer = setTimeout(() => req.destroy(new Error("Website request timed out.")), 8000);
    req.on("close", () => clearTimeout(timer)); req.on("error", reject); req.end();
  });
}
function plain(value: string) { return value.replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&(?:nbsp|lt|gt);/g," ").replace(/\s+/g," ").trim(); }
export function parseCompanyHtml(html: string, sourceUrl: string): CompanyContent {
  // No DOM execution, external resources, LLM calls, or HTML rendering.
  const safe = html.replace(/<!--[^]*?-->/g, "").replace(/<(script|style|template|noscript)\b[^>]*>[^]*?<\/\1\s*>/gi, "");
  const name = plain(safe.match(/<h1\b[^>]*>([^]*?)<\/h1>/i)?.[1] ?? safe.match(/<title\b[^>]*>([^]*?)<\/title>/i)?.[1] ?? "").slice(0,160);
  const paragraphs = [...safe.matchAll(/<p\b[^>]*>([^]*?)<\/p>/gi)].map(m => plain(m[1]));
  const location = paragraphs.find(p => /^location:/i.test(p))?.replace(/^location:\s*/i, "").replace(/, Canada$/i, "") ?? "";
  const links = [...safe.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([^]*?)<\/a>/gi)];
  const websiteLink = links.find(m => /^(?:company website|website|home)$/i.test(plain(m[2])) && companyWebsiteUrl(m[1]));
  return { name, website: websiteLink?.[1] ?? sourceUrl, description: paragraphs.filter(p => !/^location:/i.test(p)).join("\n").slice(0,6000), location, sector: paragraphs.find(p => /^services:/i.test(p))?.replace(/^services:\s*/i, "").slice(0,200) ?? "" };
}
