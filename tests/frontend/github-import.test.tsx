// @vitest-environment jsdom
import "./setup";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { GitHubImportPanel } from "@/components/project-editor/GitHubImportPanel";
const suggestions = { title: "From GitHub", description: "Public suggestion", repositoryUrl: "https://github.com/qa/xr-studio", technologies: ["TypeScript"] };
describe("explicit GitHub suggestion review", () => {
  test("technology review preserves commas while typing multiple editable values", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(suggestions))); const apply = vi.fn(); render(<GitHubImportPanel onApply={apply} disabled={false} />);
    fireEvent.change(screen.getByLabelText("Public GitHub repository URL"), { target: { value: suggestions.repositoryUrl } }); await userEvent.click(screen.getByRole("button", { name: "Review GitHub suggestions" }));
    const field = await screen.findByLabelText("Suggested project technologies"); await userEvent.clear(field); await userEvent.type(field, "Rust, CSS");
    expect(field).toHaveValue("Rust, CSS"); await userEvent.click(screen.getByRole("button", { name: "Apply reviewed suggestions" })); expect(apply).toHaveBeenCalledWith({ ...suggestions, technologies: ["Rust", "CSS"] });
  });
  test("cancelled application keeps the reviewed suggestions available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(suggestions))); render(<GitHubImportPanel onApply={() => false} disabled={false} />);
    fireEvent.change(screen.getByLabelText("Public GitHub repository URL"), { target: { value: suggestions.repositoryUrl } }); await userEvent.click(screen.getByRole("button", { name: "Review GitHub suggestions" })); await screen.findByLabelText("Suggested title");
    await userEvent.click(screen.getByRole("button", { name: "Apply reviewed suggestions" })); expect(screen.getByLabelText("Suggested title")).toHaveValue(suggestions.title);
  });
  test("nothing is applied until edited suggestions are explicitly confirmed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(suggestions))); const apply = vi.fn(); render(<GitHubImportPanel onApply={apply} disabled={false} />);
    fireEvent.change(screen.getByLabelText("Public GitHub repository URL"), { target: { value: suggestions.repositoryUrl } }); await userEvent.click(screen.getByRole("button", { name: "Review GitHub suggestions" }));
    await screen.findByLabelText("Suggested title"); expect(apply).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Suggested title"), { target: { value: "My edited title" } }); await userEvent.click(screen.getByRole("button", { name: "Apply reviewed suggestions" }));
    expect(apply).toHaveBeenCalledWith({ ...suggestions, title: "My edited title" });
  });
  test("failure is focused, explains manual recovery and does not apply anything", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: { message: "GitHub unavailable. Continue manually." } }, { status: 429 }))); const apply = vi.fn(); render(<GitHubImportPanel onApply={apply} disabled={false} />);
    fireEvent.change(screen.getByLabelText("Public GitHub repository URL"), { target: { value: suggestions.repositoryUrl } }); await userEvent.click(screen.getByRole("button", { name: "Review GitHub suggestions" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus()); expect(apply).not.toHaveBeenCalled(); expect(screen.getByRole("button", { name: "Review GitHub suggestions" })).toBeEnabled();
  });
});
