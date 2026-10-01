import { beforeEach, describe, expect, test, vi } from "vitest";

const { createContextualInquiry } = vi.hoisted(() => ({ createContextualInquiry: vi.fn() }));

vi.mock("@/db/queries/inquiry", () => ({ createContextualInquiry }));
vi.mock("@/db/runtime", () => ({ getRuntimeDatabase: () => ({}) }));

describe("inquiry API database failure", () => {
  beforeEach(() => createContextualInquiry.mockReset());

  test("returns a recoverable structured 500 rather than validation or not-found", async () => {
    createContextualInquiry.mockRejectedValueOnce(new Error("database unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { POST } = await import("@/app/api/v1/inquiries/route");
    const response = await POST(new Request("http://localhost/api/v1/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "student",
        sourceId: "S01",
        companyName: "Example Inc.",
        contactName: "Alex Employer",
        contactEmail: "alex@example.com",
        description: "We would like to discuss an internship opportunity.",
      }),
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "The inquiry could not be submitted right now.",
        details: [],
      },
    });
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
