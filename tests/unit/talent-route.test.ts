import { beforeEach, expect, test, vi } from "vitest";

const { query, metadata } = vi.hoisted(() => ({ query: vi.fn(), metadata: vi.fn() }));
vi.mock("@/db/runtime", () => ({ getRuntimeDatabase: () => ({}) }));
vi.mock("@/db/queries/talent", () => ({ queryTalentDirectory: query, getFilterMetadata: metadata }));
import { GET } from "@/app/api/v1/talent/route";

beforeEach(() => {
  query.mockReset().mockResolvedValue({ items: [], count: 0 });
  metadata.mockReset().mockResolvedValue({ skills: [{ value: "Unity", label: "Unity" }] });
});

test.each(["unity", "UnItY", "Unity"])("API accepts %s as canonical Unity", async (skill) => {
  const response = await GET(new Request(`http://localhost/api/v1/talent?skill=${skill}`));
  expect(response.status).toBe(200);
  expect(query).toHaveBeenCalledWith({}, expect.objectContaining({ skills: ["Unity"] }));
});

test("API rejects unknown skills with actionable 400 and never queries unfiltered results", async () => {
  const response = await GET(new Request("http://localhost/api/v1/talent?skill=unknown"));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: {
    code: "INVALID_QUERY", details: [{ field: "skill", code: "UNKNOWN_SKILL", value: "unknown" }],
  } });
  expect(query).not.toHaveBeenCalled();
});
