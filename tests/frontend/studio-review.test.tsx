// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Review } from "@/studio/Review";
import type { studioDetail } from "@/studio/service";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const initial: Awaited<ReturnType<typeof studioDetail>> = {
  project: { id: "project", title: "Project", description: "Owner project", version: 4 },
  submission: null, history: [], owner: true, role: null,
};
function submitted(overrides: Partial<typeof initial> = {}): typeof initial {
  return {
    ...initial,
    submission: {
      projectId: "project", submittedBy: "owner", state: "approved",
      title: "Saved owner title", summary: "Saved owner summary", mediaUrl: "", demoUrl: "",
      version: 7, contentVersion: 2, acceptedVersion: null, acceptedBy: null,
      acceptedProjectVersion: null, published: false, updatedAt: new Date(),
      ownerApprovalCurrent: false, effectivePublished: false,
    },
    ...overrides,
  };
}
test("owner sees labelled submission fields and cannot act as reviewer", () => {
  render(<Review initial={initial} />);
  expect(screen.getByLabelText("Showcase title")).toBeDefined();
  expect(screen.getByRole("button", { name: "Submit showcase request" })).toBeDefined();
  expect(screen.queryByRole("button", { name: "Approve review" })).toBeNull();
});
test("revision conflict retains owner input and announces recovery", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: "EDIT CONFLICT" } }) }));
  render(<Review initial={initial} />);
  fireEvent.change(screen.getByLabelText("Showcase title"), { target: { value: "Unsaved owner title" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit showcase request" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("EDIT CONFLICT"));
  expect((screen.getByLabelText("Showcase title") as HTMLInputElement).value).toBe("Unsaved owner title");
});

test.each(["xr_curator", "xr_admin", "platform_super_admin"] as const)("%s cannot act as the owner in the review UI", role => {
  render(<Review initial={submitted({ owner: false, role })} />);
  for (const name of ["Approve this exact showcase content", "Withdraw showcase", "Resubmit this content"]) {
    expect(screen.queryByRole("button", { name })).toBeNull();
  }
  expect(screen.getByRole("button", { name: "Save suggestions (requires owner approval)" })).toBeDefined();
  expect(Boolean(screen.queryByRole("button", { name: "Publish approved showcase" }))).toBe(role !== "xr_curator");
  expect(Boolean(screen.queryByRole("button", { name: "Unpublish curated showcase" }))).toBe(role !== "xr_curator");
});

test("owner acceptance sends the saved revision without unsaved staff-owner suggestions", async () => {
  const detail = submitted({ role: "xr_admin" });
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => detail });
  vi.stubGlobal("fetch", fetch);
  render(<Review initial={detail} />);
  fireEvent.change(screen.getByLabelText("Showcase title"), { target: { value: "Unsaved proposal" } });
  fireEvent.click(screen.getByRole("button", { name: "Approve this exact showcase content" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Saved."));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ action: "accept", version: 7, note: "" });
  expect(screen.getByRole("heading", { name: "Saved owner title" })).toBeDefined();
});

test("successful first submission switches from project version to the returned submission revision", async () => {
  const detail = submitted();
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => detail });
  vi.stubGlobal("fetch", fetch);
  render(<Review initial={initial} />);
  fireEvent.click(screen.getByRole("button", { name: "Submit showcase request" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Submit showcase request" })).toBeNull());
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    action: "submit", version: 4, note: "",
    content: { title: "Project", summary: "Owner project", mediaUrl: "", demoUrl: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Withdraw showcase" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ action: "withdraw", version: 7, note: "" });
});
