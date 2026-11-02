// @vitest-environment jsdom
import "./setup";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ProjectTeam } from "@/components/project-editor/ProjectTeam";
import type { ProjectTeamData } from "@/projects/team-types";

const own = { id: "own", profileId: "profile", name: "Student", state: "accepted" as const, version: 2, proposedRoleId: "xr-developer", removedAt: null, restoredAt: null, removalReason: "", contribution: { roleId: "xr-developer", statement: "Saved words", featured: true, publicVisible: true, version: 1 } };
const data: ProjectTeamData = { project: { id: "canonical-id", title: "Team project", description: "Shared evidence", publicationStatus: "published", version: 3 }, isMaintainer: false, ownMembershipId: "own", members: [own], transfers: [], joinRequests: [], roles: [{ id: "xr-developer", name: "XR Developer" }] };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
describe("personal project team controls", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  test("only own role, statement and visibility are sent with the contribution revision", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(reply({ ok: true })).mockResolvedValueOnce(reply(data));
    render(<ProjectTeam initialData={data} />);
    await userEvent.click(screen.getByLabelText("Feature this project in my portfolio"));
    fireEvent.change(screen.getByLabelText(/Your contribution statement/), { target: { value: "My own words" } });
    await userEvent.click(screen.getByRole("button", { name: "Save my contribution" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Personal contribution saved."));
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ version: 1, contribution: { roleId: "xr-developer", statement: "My own words", featured: false, publicVisible: true } });
    expect(screen.queryByRole("heading", { name: "Add Teammate." })).not.toBeInTheDocument();
  });
  test("stale contribution retains unsaved text and asks before replacing it", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(reply({ error: { message: "This record changed. Reload before saving." } }, 409));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ProjectTeam initialData={data} />);
    fireEvent.change(screen.getByLabelText(/Your contribution statement/), { target: { value: "Keep these words" } });
    await userEvent.click(screen.getByRole("button", { name: "Save my contribution" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expect(screen.getByLabelText(/Your contribution statement/)).toHaveValue("Keep these words");
    await userEvent.click(screen.getByRole("button", { name: "Load latest project team" })); expect(fetch).toHaveBeenCalledTimes(1);
    confirm.mockReturnValue(true); vi.mocked(fetch).mockResolvedValueOnce(reply(data));
    await userEvent.click(screen.getByRole("button", { name: "Load latest project team" }));
    await waitFor(() => expect(screen.getByLabelText(/Your contribution statement/)).toHaveValue("Saved words")); confirm.mockRestore();
  });
  test("invitation discloses public defaults and has no personal edit form before consent", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(reply({ ok: true })).mockResolvedValueOnce(reply(data));
    render(<ProjectTeam initialData={{ ...data, members: [{ ...own, state: "pending", version: 1, contribution: null }] }} />);
    expect(screen.getByText(/featured by default/)).toBeVisible();
    expect(screen.queryByLabelText(/Your contribution statement/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(screen.getByLabelText(/Your contribution statement/)).toBeVisible());
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ version: 1, accept: true });
  });
  test("stale transfer disables acceptance but retains a decline action", () => {
    render(<ProjectTeam initialData={{ ...data, transfers: [{ id: "offer", state: "pending", toMembershipId: "own", projectVersion: 2 }] }} />);
    expect(screen.getByRole("button", { name: "Accept maintenance" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decline maintenance" })).toBeEnabled();
  });
  test("removed relationships show a notice without exposing contribution editing", () => {
    render(<ProjectTeam initialData={{ ...data, members: [{ ...own, state: "removed", removalReason: "Attribution review", removedAt: new Date("2026-10-31T15:00:00Z") }] }} />);
    expect(screen.getByRole("heading", { name: "Your relationship was removed." })).toBeVisible();
    expect(screen.getByText("Reason: Attribution review")).toBeVisible();
    expect(screen.getByText("Removed: 2026-10-31")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Save my contribution" })).not.toBeInTheDocument();
  });
});
