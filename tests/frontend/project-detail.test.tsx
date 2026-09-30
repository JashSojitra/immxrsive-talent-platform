/** @vitest-environment jsdom */

import "./setup";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProjectError from "@/app/projects/[projectId]/error";
import ProjectNotFound from "@/app/projects/[projectId]/not-found";
import { ProjectDetailView } from "@/components/project-detail/ProjectDetailView";
import type { PublicProjectDetail } from "@/db/queries/project-detail";

const project: PublicProjectDetail = {
  id: "P01",
  title: "Industrial Safety VR Trainer",
  description: "Immersive safety training prototype for industrial onboarding.",
  domain: "Training / Simulation",
  technologies: ["Unity", "C#", "Blender"],
  contributors: [
    {
      studentId: "S01",
      name: "Avery Chen",
      headline: "XR Developer focused on training simulations",
      role: "XR Developer",
      profileUrl: "/students/S01",
    },
    {
      studentId: "S02",
      name: "Maya Patel",
      headline: "3D Artist and technical artist",
      role: "3D Artist",
      profileUrl: "/students/S02",
    },
  ],
  assets: [{ type: "demo", label: "Demo", url: "https://example.invalid/demo" }],
};

describe("public project detail", () => {
  beforeEach(() => {
    window.__IMMXRSIVE_DISABLE_MOTION__ = true;
  });

  it("renders the complete project evidence structure", () => {
    render(<ProjectDetailView project={project} />);
    expect(screen.getByRole("heading", { level: 1, name: project.title })).toBeInTheDocument();
    expect(screen.getByText(project.description)).toBeInTheDocument();
    expect(screen.getByText(project.domain)).toBeInTheDocument();
    expect(screen.getByLabelText(`${project.title} project technologies`)).toHaveTextContent(/Unity.*C#.*Blender/);
    expect(screen.getByLabelText(`${project.title} contributors`)).toHaveTextContent(/XR Developer.*Avery Chen.*3D Artist.*Maya Patel/);
  });

  it("keeps technologies conceptually separate from contributor roles and skills", () => {
    render(<ProjectDetailView project={project} />);
    expect(screen.getByText(/technologies used by the project/i)).toBeInTheDocument();
    expect(screen.getByText(/not the skills of every contributor/i)).toBeInTheDocument();
    expect(screen.getByText(/individual skills live only on each published student profile/i)).toBeInTheDocument();
  });

  it("links published contributors and preserves an unavailable relationship without a link", () => {
    const privateContributor: PublicProjectDetail = {
      ...project,
      contributors: [
        ...project.contributors,
        { studentId: "S16", name: null, headline: null, role: "QA Tester", profileUrl: null },
      ],
    };
    render(<ProjectDetailView project={privateContributor} />);
    expect(screen.getByRole("link", { name: /avery chen/i })).toHaveAttribute("href", "/students/S01");
    expect(screen.getByText("QA Tester")).toBeInTheDocument();
    expect(screen.getByText("Public profile unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /public profile unavailable/i })).not.toBeInTheDocument();
  });

  it("renders a broken optional URL as a safe accessible external link", () => {
    render(<ProjectDetailView project={project} />);
    const asset = screen.getByRole("link", { name: /demo.*opens in a new tab/i });
    expect(asset).toHaveAttribute("href", "https://example.invalid/demo");
    expect(asset).toHaveAttribute("target", "_blank");
    expect(asset).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("preserves project identity in the inquiry action", () => {
    render(<ProjectDetailView project={project} />);
    expect(screen.getByRole("link", { name: /project inquiry for industrial safety/i })).toHaveAttribute(
      "href",
      "/inquiry/project/P01",
    );
  });

  it("keeps primary project actions keyboard reachable", async () => {
    const user = userEvent.setup();
    render(<ProjectDetailView project={project} />);
    await user.tab();
    expect(screen.getByRole("link", { name: /skip to project evidence/i })).toHaveFocus();
    screen.getByRole("link", { name: /avery chen/i }).focus();
    expect(screen.getByRole("link", { name: /avery chen/i })).toHaveFocus();
    screen.getByRole("link", { name: /project inquiry for industrial safety/i }).focus();
    expect(screen.getByRole("link", { name: /project inquiry for industrial safety/i })).toHaveFocus();
  });

  it("settles all content immediately for reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query.includes("prefers-reduced-motion"), media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(),
      removeListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    const { container } = render(<ProjectDetailView project={project} />);
    expect(container.querySelector("main")).toHaveAttribute("data-motion", "reduced");
    expect(screen.getByText("XR Developer")).toBeVisible();
    expect(screen.getByRole("link", { name: /project inquiry/i })).toBeVisible();
  });
});

describe("project route states", () => {
  it("shows a useful project-specific not-found state", () => {
    render(<ProjectNotFound />);
    expect(screen.getByRole("heading", { name: /project.*not available/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to talent index/i })).toHaveAttribute("href", "/talent");
  });

  it("shows a distinct recoverable server error state", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<ProjectError error={new Error("database unavailable")} reset={reset} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/couldn't load this project/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
