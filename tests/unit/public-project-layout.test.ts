import { beforeEach, expect, test, vi } from "vitest";

const { getPublicProject, notFound } = vi.hoisted(() => ({
  getPublicProject: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_HTTP_ERROR_FALLBACK;404"); }),
}));
vi.mock("@/db/public-project", () => ({ getPublicProject }));
vi.mock("next/navigation", () => ({ notFound }));
import PublicProjectLayout from "@/app/projects/[projectId]/layout";

beforeEach(() => vi.clearAllMocks());

test.each(["not-a-uuid", "00000000-0000-4000-8000-000000000000", "private-project"])(
  "gates unavailable public project %s before rendering children", async (projectId) => {
    getPublicProject.mockResolvedValue(null);
    await expect(PublicProjectLayout({ children: "private details", params: Promise.resolve({ projectId }) }))
      .rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(getPublicProject).toHaveBeenCalledWith(projectId);
  },
);

test("preserves children for a published legacy fixture", async () => {
  getPublicProject.mockResolvedValue({ id: "P01" });
  expect(await PublicProjectLayout({ children: "published details", params: Promise.resolve({ projectId: "P01" }) }))
    .toBe("published details");
  expect(notFound).not.toHaveBeenCalled();
});

test("does not disguise an infrastructure failure as missing content", async () => {
  getPublicProject.mockRejectedValue(new Error("database unavailable"));
  await expect(PublicProjectLayout({ children: "details", params: Promise.resolve({ projectId: "P01" }) }))
    .rejects.toThrow("database unavailable");
  expect(notFound).not.toHaveBeenCalled();
});
