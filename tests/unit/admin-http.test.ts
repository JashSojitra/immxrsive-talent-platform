import { afterEach, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/server", () => ({ requireAuthenticatedRequestUser: vi.fn(), requireVerifiedRequestStudent: vi.fn(), AuthenticationRequiredError: class extends Error {}, AffiliationVerificationRequiredError: class extends Error {} }));
vi.mock("@/admin/service", () => ({ adminCreate: vi.fn(), adminCommand: vi.fn(), adminList: vi.fn(), adminDetail: vi.fn(), adminActivity: vi.fn(), adminIdentity: vi.fn(), accessList: vi.fn(), changeAccess: vi.fn(), lockStaff: vi.fn(), adminDuplicates: vi.fn() }));
import { AuthenticationRequiredError } from "@/auth/server";
import { adminCreate, adminCommand, changeAccess } from "@/admin/service";
import { createAdminHandler } from "@/admin/http";
import type { Database } from "@/db/client";
const db = { synthetic: true } as unknown as Database;
const origin = "https://platform.example";
const authorized = createAdminHandler({ authorize: async () => ({ id: "authenticated-session-user" }), database: () => db, origin });
const request = (body: string, headers = {}) => new Request(`${origin}/api/admin/projects`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...headers }, body });
afterEach(() => vi.resetAllMocks());
test("anonymous API denies before resolving database or invoking a service", async () => {
  const database = vi.fn(); const handler = createAdminHandler({ authorize: async () => { throw new AuthenticationRequiredError(); }, database });
  const response = await handler(new Request(`${origin}/api/admin/projects`), "list");
  expect(response.status).toBe(401); expect(database).not.toHaveBeenCalled(); expect(response.headers.get("cache-control")).toContain("no-store");
});
test("create actor comes exclusively from session and unknown request actor is rejected", async () => {
  vi.mocked(adminCreate).mockResolvedValue({ synthetic: true } as never);
  expect((await authorized(request(JSON.stringify({ content: {}, actor: "forged" })), "create")).status).toBe(422);
  expect(adminCreate).not.toHaveBeenCalled();
  expect((await authorized(request(JSON.stringify({ content: { title: "Example" } })), "create")).status).toBe(201);
  expect(adminCreate).toHaveBeenCalledWith(db, "authenticated-session-user", { title: "Example" });
});
test("content and access service boundaries receive authenticated actor independently of payload", async () => {
  vi.mocked(adminCommand).mockResolvedValue({ synthetic: true } as never); vi.mocked(changeAccess).mockResolvedValue({ changed: true });
  const c = { action: "publish", version: 1 }; await authorized(request(JSON.stringify(c)), "command", "canonical");
  expect(adminCommand).toHaveBeenCalledWith(db, "authenticated-session-user", "canonical", c);
  const access = { subject: "target", expectedRole: null, role: "xr_curator", reason: "Approved operator" }; await authorized(request(JSON.stringify(access)), "access");
  expect(changeAccess).toHaveBeenCalledWith(db, "authenticated-session-user", access);
});
test.each([
  [{ Origin: "https://attacker.example" }, "{}", 403],
  [{ Origin: "" }, "{}", 403],
  [{ "sec-fetch-site": "cross-site" }, "{}", 403],
  [{ "Content-Type": "text/plain" }, "{}", 400],
  [{}, "{", 400],
  [{}, "x".repeat(65537), 413],
] as const)("mutations enforce bounded same-origin JSON: %j", async (headers, body, status) => {
  const response = await authorized(request(body, headers), "create"); expect(response.status).toBe(status); expect(adminCreate).not.toHaveBeenCalled(); expect(response.headers.get("cache-control")).toContain("no-store");
});
