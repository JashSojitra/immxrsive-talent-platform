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
