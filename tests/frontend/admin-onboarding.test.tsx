// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AdminEditor } from "@/admin/Editor";
import { AdminExperience } from "@/admin/Experience";
import { emptyContent } from "@/admin/policy";
import "./setup";
vi.mock("@/components/project-editor/ScreenshotsEditor", () => ({ ScreenshotsEditor: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const initial = { ...emptyContent, title: "Synthetic showcase", summary: "Summary", description: "Narrative", fallbackText: "Independent fallback narrative", credits: [{ name: "Manual credit", role: "Designer", statement: "Made images", profileId: "" }] };
const record = { id: "stable-id", version: 3, lifecycle: "draft" };
test("labelled manual workflow publishes without student authorization UI or actor payload", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ project: { id: "stable-id", version: 4 }, detail: { lifecycle: "published" } }) }); vi.stubGlobal("fetch", fetch);
  render(<AdminEditor initial={initial} record={record} role="xr_admin" />);
  expect(screen.getByLabelText("Title")).toBeDefined(); expect(screen.getByLabelText("Name — credit 1")).toBeDefined();
  expect(screen.queryByRole("button", { name: /invite|approval|consent/i })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Publish directly" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("published"));
  const body = JSON.parse(fetch.mock.calls[0][1].body); expect(body).toMatchObject({ action: "publish", version: 3 }); expect(body.actor).toBeUndefined(); expect(body.role).toBeUndefined(); expect(body.content.credits[0].profileId).toBe("");
});
test("stale revision feedback keeps entered fields and focuses recovery message", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: "Another administrator changed this project" } }) }));
  render(<AdminEditor initial={initial} record={record} role="xr_admin" />);
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Unsaved edited title" } }); fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("entries are retained")); expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Unsaved edited title");
});
test("curator sees read-only content and no mutation actions", () => {
  render(<AdminEditor initial={initial} record={record} role="xr_curator" />);
  expect((screen.getByLabelText("Title") as HTMLInputElement).disabled || screen.getByLabelText("Title").closest("fieldset")?.disabled).toBe(true);
  expect(screen.queryByRole("button", { name: "Publish directly" })).toBeNull(); expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
});
test("import suggestions require explicit apply and retain curator edits", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ suggestions: { title: "Imported title", summary: "Imported summary", description: "Imported narrative", originalRepository: "https://github.com/demo/repo", technologies: ["JavaScript"], liveUrl: "https://example.com/demo", updatedAt: null }, duplicates: [] }) }));
  render(<AdminEditor initial={initial} role="xr_admin" />);
  fireEvent.change(screen.getByLabelText("Public GitHub repository URL"), { target: { value: "https://github.com/demo/repo" } }); fireEvent.click(screen.getByRole("button", { name: "Fetch repository suggestions" }));
  await screen.findByRole("button", { name: "Apply suggestions to empty fields" }); expect((screen.getByLabelText("Original GitHub repository") as HTMLInputElement).value).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Apply suggestions to empty fields" }));
  expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(initial.title); expect((screen.getByLabelText("Original GitHub repository") as HTMLInputElement).value).toBe("https://github.com/demo/repo");
});
test("archived records expose restore but no publish until restored", () => {
  render(<AdminEditor initial={initial} record={{ ...record, lifecycle: "archived" }} role="platform_super_admin" />);
  expect(screen.getByRole("button", { name: "Restore as private draft" })).toBeDefined(); expect(screen.queryByRole("button", { name: "Publish directly" })).toBeNull();
});
test("embed launches explicitly with opaque sandbox and persistent fallback", async () => {
  render(<AdminExperience content={{ ...initial, demoMode: "embed", liveUrl: "https://example.com/demo", credits: undefined } as never} />);
  expect(document.querySelector("iframe")).toBeNull(); expect(screen.getByText(initial.fallbackText)).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Launch embedded experience" }));
  const frame = document.querySelector("iframe")!; expect(frame.getAttribute("sandbox")).toBe("allow-scripts"); expect(frame.getAttribute("allow")).toContain("camera 'none'");
  fireEvent.load(frame); expect(screen.getByRole("status").textContent).toContain("If framing is blocked"); expect(screen.getByText(initial.fallbackText)).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Close experience" })); expect(document.querySelector("iframe")).toBeNull();
});
test("native devices, unavailable media and mobile alternative retain meaningful evidence", () => {
  render(<AdminExperience content={{ ...initial, demoMode: "native", deviceInfo: "Native headset", instructions: "Install trusted package outside browser", thumbnail: "https://example.com/preview.png", thumbnailAlt: "Narrative screenshot" }} />);
  expect(screen.getByText(/does not run automatically/)).toBeDefined(); expect(screen.getByText(/On mobile or unsupported devices/)).toBeDefined();
  fireEvent.error(screen.getByAltText("Narrative screenshot")); expect(screen.getByText("Image unavailable. Narrative screenshot")).toBeDefined();
});
test("profile lookup adds a linked credit without inventing role or contribution text", async () => {
  const profileId = "11111111-2222-4333-8444-555555555555";
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: profileId, name: "Verified Student", headline: "XR developer", program: "CS" }] }); vi.stubGlobal("fetch", fetch);
  render(<AdminEditor initial={initial} record={record} role="xr_admin" />);
  const search = screen.getByLabelText("Find a student profile by name");
  expect((screen.getByRole("button", { name: "Search profiles" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(search, { target: { value: "Verified & co" } }); fireEvent.click(screen.getByRole("button", { name: "Search profiles" }));
  const add = await screen.findByRole("button", { name: "Add linked credit for Verified Student" });
  expect(fetch.mock.calls[0][0]).toBe("/api/admin/profiles?q=Verified%20%26%20co");
  fireEvent.click(add);
  expect((screen.getByLabelText("Name — credit 2") as HTMLInputElement).value).toBe("Verified Student");
  expect((screen.getByLabelText("Profile internal ID (optional) — credit 2") as HTMLInputElement).value).toBe(profileId);
  expect((screen.getByLabelText("Project role — credit 2") as HTMLInputElement).value).toBe("");
  expect((screen.getByLabelText("Contribution description — credit 2") as HTMLInputElement).value).toBe("");
  expect((screen.getByRole("button", { name: "Add linked credit for Verified Student" }) as HTMLButtonElement).disabled).toBe(true);
});
test("empty profile lookup explains verification and publication requirements", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
  render(<AdminEditor initial={initial} record={record} role="xr_admin" />);
  fireEvent.change(screen.getByLabelText("Find a student profile by name"), { target: { value: "Nobody" } }); fireEvent.click(screen.getByRole("button", { name: "Search profiles" }));
  expect(await screen.findByText(/Add an Algoma email credit to link a student when they join/)).toBeDefined();
});
test("curator cannot use profile lookup", () => {
  render(<AdminEditor initial={initial} record={record} role="xr_curator" />);
  expect(screen.getByLabelText("Find a student profile by name").closest("fieldset")?.disabled).toBe(true);
});
