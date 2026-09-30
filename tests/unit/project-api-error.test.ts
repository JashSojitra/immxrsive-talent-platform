import { beforeEach, describe, expect, test, vi } from "vitest";

const { queryPublicProject } = vi.hoisted(() => ({ queryPublicProject: vi.fn() }));

vi.mock("@/db/queries/project-detail", () => ({ queryPublicProject }));
vi.mock("@/db/runtime", () => ({ getRuntimeDatabase: () => ({}) }));

describe("project API failure isolation", () => {
  beforeEach(() => {
    queryPublicProject.mockReset();
  });

  test("database failures return a structured 500 rather than a false 404", async () => {
    queryPublicProject.mockRejectedValueOnce(new Error("database unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { GET } = await import("@/app/api/v1/projects/[projectId]/route");

    const response = await GET(
      new Request("http://localhost/api/v1/projects/P01"),
      { params: Promise.resolve({ projectId: "P01" }) },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "The project is temporarily unavailable.",
        details: [],
      },
    });
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
