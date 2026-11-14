import { afterEach, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/server", () => ({
  requireAuthenticatedRequestUser: vi.fn(), requireVerifiedRequestStudent: vi.fn(),
  AuthenticationRequiredError: class extends Error {}, AffiliationVerificationRequiredError: class extends Error {},
}));
vi.mock("@/db/runtime", () => ({ getRuntimeDatabase: vi.fn(() => ({ synthetic: true })) }));
vi.mock("@/studio/service", () => ({ studioCommand: vi.fn(), studioDetail: vi.fn(), studioList: vi.fn() }));
import { AuthenticationRequiredError, requireAuthenticatedRequestUser } from "@/auth/server";
import { studioCommand, studioDetail, studioList } from "@/studio/service";
import { handleStudio } from "@/studio/http";
const origin = "https://studio.example.com";
function request(body: string, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/studio/project`, { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body });
}
function signedIn() {
  vi.stubEnv("BETTER_AUTH_URL", origin);
  vi.mocked(requireAuthenticatedRequestUser).mockResolvedValue({ id: "session-actor" } as Awaited<ReturnType<typeof requireAuthenticatedRequestUser>>);
}
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });
test("unauthenticated Studio requests fail closed with no cacheable data", async () => {
  vi.mocked(requireAuthenticatedRequestUser).mockRejectedValue(new AuthenticationRequiredError());
  const response = await handleStudio(new Request(`${origin}/api/studio`));
  expect(response.status).toBe(401);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(studioList).not.toHaveBeenCalled();
});
test("Studio mutations use the authenticated actor, never a body identity", async () => {
  signedIn(); vi.mocked(studioCommand).mockResolvedValue({ synthetic: true } as unknown as Awaited<ReturnType<typeof studioCommand>>);
  const body = { action: "accept", version: 1, actor: "forged" };
  const response = await handleStudio(request(JSON.stringify(body)), "project");
  expect(response.status).toBe(200);
  expect(studioCommand).toHaveBeenCalledWith({ synthetic: true }, "session-actor", "project", body);
  expect(response.headers.get("cache-control")).toContain("no-store");
  // Strict command schema rejects the extra field in the real service (policy tests).
});
test.each([
  [{ origin: "https://attacker.example.com" }, "{}", 403],
  [{ origin: "" }, "{}", 403],
  [{ "sec-fetch-site": "cross-site" }, "{}", 403],
  [{ "content-type": "text/plain" }, "{}", 400],
  [{}, "{", 400],
  [{}, "x".repeat(65537), 413],
] as const)("Studio rejects unsafe body boundary %j", async (headers, body, status) => {
  signedIn();
  const response = await handleStudio(request(body, headers), "project");
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(studioCommand).not.toHaveBeenCalled();
});
test("Studio errors do not expose database internals", async () => {
  signedIn(); vi.mocked(studioDetail).mockRejectedValue(new Error("private SQL and connection detail"));
  const response = await handleStudio(new Request(`${origin}/api/studio/project`), "project");
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain("private SQL");
});
