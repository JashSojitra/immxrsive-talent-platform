// @vitest-environment jsdom
import "./setup";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ProjectEditor } from "@/components/project-editor/ProjectEditor";
import type { ProjectEditorData } from "@/projects/types";
const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
const saved: ProjectEditorData = { project: { id: "de55dcde-737a-4ffa-80db-5dd7dc5f6440", version: 1, publicationStatus: "unpublished" }, draft: { title: "Saved title", description: "Saved description", domain: "XR", projectDate: null, projectStatus: "in_progress", technologies: ["Unity"], repositories: [], links: [], media: [] } };
const roles = [{ id: "xr-developer", name: "XR Developer" }];
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
describe("manual project editor", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); navigation.replace.mockReset(); navigation.refresh.mockReset(); });
  test("manual creation sends technologies and zero repositories without ownership fields", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(reply({ hasExactMatch: false, matches: [] })).mockResolvedValueOnce(reply(saved, 201));
    render(<ProjectEditor initialData={null} roles={roles} />);
    fireEvent.change(screen.getByLabelText("Project title"), { target: { value: "New work" } });
    fireEvent.change(screen.getByLabelText("Domain / type"), { target: { value: "Art" } });
    fireEvent.change(screen.getByLabelText("Project technologies"), { target: { value: "Unity, Blender" } });
    fireEvent.submit(screen.getByRole("form", { name: "Project editor" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(`/student/projects/${saved.project.id}/edit`));
    const init = vi.mocked(fetch).mock.calls[1][1]!;
    expect(JSON.parse(init.body as string)).toMatchObject({ creatorRoleId: "xr-developer", draft: { title: "New work", technologies: ["Unity", "Blender"], repositories: [] } });
    expect(init.body).not.toContain("maintainerUserId");
  });
  test("a stale save preserves input and requires confirmation before reloading", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(reply({ error: { code: "EDIT_CONFLICT", message: "Reload before saving." } }, 409));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ProjectEditor initialData={saved} roles={roles} />);
    fireEvent.change(screen.getByLabelText("Project title"), { target: { value: "My unsaved title" } });
    await userEvent.click(screen.getByRole("button", { name: "Save project" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expect(screen.getByLabelText("Project title")).toHaveValue("My unsaved title");
    expect(screen.getByRole("button", { name: "Publish project" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Load latest saved project" }));
    expect(fetch).toHaveBeenCalledTimes(1);
    confirm.mockReturnValue(true); vi.mocked(fetch).mockResolvedValueOnce(reply({ ...saved, project: { ...saved.project, version: 2 }, draft: { ...saved.draft, title: "Latest saved" } }));
    await userEvent.click(screen.getByRole("button", { name: "Load latest saved project" }));
    await waitFor(() => expect(screen.getByLabelText("Project title")).toHaveValue("Latest saved"));
    expect(screen.getByRole("button", { name: "Publish project" })).toBeEnabled(); confirm.mockRestore();
  });
  test("field validation and network failures keep entered values available", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(reply({ error: { code: "VALIDATION_ERROR", message: "Review title", details: [{ field: "draft.title", message: "Title is too long." }] } }, 422));
    render(<ProjectEditor initialData={saved} roles={roles} />);
    fireEvent.change(screen.getByLabelText("Project title"), { target: { value: "Edited" } });
    await userEvent.click(screen.getByRole("button", { name: "Save project" }));
    await waitFor(() => expect(screen.getByLabelText("Project title")).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByLabelText("Project title")).toHaveValue("Edited");
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network unavailable"));
    await userEvent.click(screen.getByRole("button", { name: "Save project" }));
    await screen.findByText(/Try again\./); expect(screen.getByLabelText("Project title")).toHaveValue("Edited");
  });
  test("publication is explicit, revision bound, and cancel does not send a request", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ProjectEditor initialData={saved} roles={roles} />);
    await userEvent.click(screen.getByRole("button", { name: "Publish project" })); expect(fetch).not.toHaveBeenCalled();
    confirm.mockReturnValue(true); vi.mocked(fetch).mockResolvedValueOnce(reply({ ...saved, project: { ...saved.project, version: 2, publicationStatus: "published" } }));
    await userEvent.click(screen.getByRole("button", { name: "Publish project" }));
    await screen.findByText("Project published.");
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ version: 1, published: true });
    expect(screen.getByRole("link", { name: "View public project" })).toHaveAttribute("href", `/projects/${saved.project.id}`); confirm.mockRestore();
  });
  test("repository and typed media rows remain labeled and keyboard reachable", async () => {
    render(<ProjectEditor initialData={saved} roles={roles} />);
    await userEvent.click(screen.getByRole("button", { name: "Add repository" }));
    await userEvent.click(screen.getByRole("button", { name: "Add repository" }));
    expect(screen.getByLabelText("Repository 2 URL")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove repository 1" }));
    expect(screen.queryByLabelText("Repository 2 URL")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add media link" }));
    await userEvent.selectOptions(screen.getByLabelText("Media 1 type"), "fallback_image");
    expect(screen.getByLabelText("Media 1 type")).toHaveValue("fallback_image");
    screen.getByLabelText("Media 1 URL").focus(); expect(screen.getByLabelText("Media 1 URL")).toHaveFocus();
  });
});
