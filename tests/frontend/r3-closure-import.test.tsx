// @vitest-environment jsdom
import "./setup";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { ProjectEditor } from "@/components/project-editor/ProjectEditor";
import type { ProjectEditorData } from "@/projects/types";
const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
const repository = "https://github.com/JashSojitra/immxrsive-talent-platform";
const playable = "https://immxrsive-talent-platform.vercel.app/";
const suggestions = { title: "immxrsive-talent-platform", description: "Synthetic platform description",
  repositoryUrl: repository.toLowerCase(), technologies: ["TypeScript", "CSS"] };
const roles = [{ id: "xr-developer", name: "XR Developer" }];
const duplicates = { hasExactMatch: true, acknowledgement: "synthetic-acknowledgement",
  matches: [{ id: "synthetic-public-project", title: "Synthetic existing platform", kind: "repository", canRequestJoin: true }] };
const reply = (body: unknown, status = 200) => Response.json(body, { status });
beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); navigation.replace.mockReset(); navigation.refresh.mockReset(); });

async function importAndFill() {
  render(<ProjectEditor initialData={null} roles={roles} />);
  fireEvent.change(screen.getByLabelText("Public GitHub repository URL"), { target: { value: repository } });
  await userEvent.click(screen.getByRole("button", { name: "Review GitHub suggestions" }));
  await screen.findByLabelText("Suggested title");
  fireEvent.change(screen.getByLabelText("Suggested title"), { target: { value: "My reviewed platform" } });
  await userEvent.click(screen.getByRole("button", { name: "Apply reviewed suggestions" }));
  expect(screen.getByLabelText("Project title")).toHaveValue("My reviewed platform");
  fireEvent.change(screen.getByLabelText("Domain / type"), { target: { value: "Web" } });
  await userEvent.click(screen.getByRole("button", { name: "Add media link" }));
  fireEvent.change(screen.getByLabelText("Media 1 label"), { target: { value: "Platform demo" } });
  fireEvent.change(screen.getByLabelText("Media 1 URL"), { target: { value: playable } });
}

test("exact reported import, duplicate review and acknowledged save preserve playable and edited suggestions", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(reply(suggestions)).mockResolvedValueOnce(reply(duplicates));
  await importAndFill();
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ url: repository });
  expect(fetch).toHaveBeenCalledTimes(1); // Import/apply never creates a project.
  fireEvent.submit(screen.getByRole("form", { name: "Project editor" }));
  await screen.findByRole("heading", { name: "Review possible existing projects." });
  expect(fetch).toHaveBeenCalledTimes(2); // Warning pauses before persistence.
  expect(screen.getByRole("link", { name: /View Project:/ })).toHaveAttribute("href", "/projects/synthetic-public-project");
  expect(screen.getByRole("button", { name: /Request to Join:/ })).toBeEnabled();
  const checked = JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string).draft;
  expect(checked).toMatchObject({ title: "My reviewed platform", repositories: [{ url: suggestions.repositoryUrl }],
    media: [{ kind: "playable", label: "Platform demo", url: playable }] });
  const saved: ProjectEditorData = { project: { id: "synthetic-created-project", version: 1, publicationStatus: "unpublished" }, draft: checked };
  vi.mocked(fetch).mockResolvedValueOnce(reply(saved, 201));
  await userEvent.click(screen.getByRole("button", { name: "Continue with a distinct project" }));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/student/projects/synthetic-created-project/edit"));
  expect(vi.mocked(fetch).mock.calls[2][0]).toBe("/api/v1/student/projects");
  expect(JSON.parse(vi.mocked(fetch).mock.calls[2][1]!.body as string)).toEqual({ draft: checked,
    creatorRoleId: "xr-developer", duplicateAcknowledgement: duplicates.acknowledgement });
  expect(screen.getByLabelText("Media 1 URL")).toHaveValue(playable);
});

test("a server race warning and failed acknowledged save keep the exact draft retryable", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(reply(suggestions))
    .mockResolvedValueOnce(reply({ hasExactMatch: false, matches: [] }))
    .mockResolvedValueOnce(reply({ error: { code: "DUPLICATE_WARNING", message: "Review current matches." }, duplicates }, 409));
  await importAndFill();
  fireEvent.submit(screen.getByRole("form", { name: "Project editor" }));
  await screen.findByRole("heading", { name: "Review possible existing projects." });
  vi.mocked(fetch).mockRejectedValueOnce(new Error("Synthetic connection lost"));
  await userEvent.click(screen.getByRole("button", { name: "Continue with a distinct project" }));
  await screen.findByText(/Try again\./);
  expect(screen.getByLabelText("Project title")).toHaveValue("My reviewed platform");
  expect(screen.getByLabelText("Repository 1 URL")).toHaveValue(suggestions.repositoryUrl);
  expect(screen.getByLabelText("Media 1 URL")).toHaveValue(playable);
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Continue with a distinct project" })).toBeEnabled();
});
