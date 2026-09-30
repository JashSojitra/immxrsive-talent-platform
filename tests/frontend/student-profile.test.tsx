/** @vitest-environment jsdom */

import "./setup";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StudentProfileError from "@/app/students/[studentId]/error";
import StudentProfileNotFound from "@/app/students/[studentId]/not-found";
import { StudentProfileView } from "@/components/student-profile/StudentProfileView";
import type { PublicStudentProfile } from "@/db/queries/student-profile";

const profile: PublicStudentProfile = {
  id: "S01",
  name: "Avery Chen",
  headline: "XR Developer focused on training simulations",
  program: "Computer Science",
  status: "current",
  availability: ["internship", "contract"],
  skills: ["Unity", "C#", "OpenXR"],
  links: [
    { type: "github", label: "Github", url: "https://github.com/example-avery" },
  ],
  projects: [
    {
      id: "P01",
      title: "Industrial Safety VR Trainer",
      description: "Immersive safety training prototype for industrial onboarding.",
      domain: "Training / Simulation",
      role: "XR Developer",
      technologies: ["Unity", "C#", "Blender"],
      links: [{ type: "demo", label: "Demo", url: "https://example.com/p01-demo" }],
    },
    {
      id: "P04",
      title: "XR Anatomy Lab",
      description: "Interactive anatomy learning environment.",
      domain: "Healthcare",
      role: "XR Developer",
      technologies: ["Unity", "C#", "OpenXR", "Meta Quest"],
      links: [{ type: "demo", label: "Demo", url: "https://example.com/p04-demo" }],
    },
  ],
};

describe("public student profile", () => {
  beforeEach(() => {
    window.__IMMXRSIVE_DISABLE_MOTION__ = true;
  });

  it("renders the complete professional shell from structured profile data", () => {
    render(<StudentProfileView profile={profile} />);

    expect(screen.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeInTheDocument();
    expect(screen.getByText(profile.headline)).toBeInTheDocument();
    expect(screen.getAllByText("Computer Science").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Avery Chen's standardized skills")).toHaveTextContent(/Unity.*C#.*OpenXR/);
    expect(screen.getAllByText("Internship / Contract").length).toBeGreaterThan(0);
  });

  it("renders every project with a clear role and future project route", () => {
    render(<StudentProfileView profile={profile} />);

    expect(screen.getByRole("heading", { name: "Industrial Safety VR Trainer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "XR Anatomy Lab" })).toBeInTheDocument();
    expect(screen.getAllByText("XR Developer")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "View project Industrial Safety VR Trainer" })).toHaveAttribute("href", "/projects/P01");
    expect(screen.getByRole("link", { name: "View project XR Anatomy Lab" })).toHaveAttribute("href", "/projects/P04");
    expect(screen.getAllByText("Project technologies")).toHaveLength(2);
  });

  it("renders safe professional and project links", () => {
    render(<StudentProfileView profile={profile} />);

    const github = screen.getByRole("link", { name: /github.*opens in a new tab/i });
    expect(github).toHaveAttribute("href", "https://github.com/example-avery");
    expect(github).toHaveAttribute("target", "_blank");
    expect(github).toHaveAttribute("rel", "noopener noreferrer");
    for (const demo of screen.getAllByRole("link", { name: /demo.*opens in a new tab/i })) {
      expect(demo).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("preserves student identity in the employer inquiry action", () => {
    render(<StudentProfileView profile={profile} />);
    expect(screen.getByRole("link", { name: /employer inquiry for avery chen/i })).toHaveAttribute(
      "href",
      "/inquiry/student/S01",
    );
  });

  it("keeps the complete link workflow keyboard accessible", async () => {
    const user = userEvent.setup();
    render(<StudentProfileView profile={profile} />);

    await user.tab();
    expect(screen.getByRole("link", { name: /skip to profile details/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: /immxrsive talent directory/i })).toHaveFocus();

    const projectLink = screen.getByRole("link", { name: "View project Industrial Safety VR Trainer" });
    projectLink.focus();
    expect(projectLink).toHaveFocus();
    const inquiryLink = screen.getByRole("link", { name: /employer inquiry for avery chen/i });
    inquiryLink.focus();
    expect(inquiryLink).toHaveFocus();
  });

  it("settles all profile content immediately for reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const { container } = render(<StudentProfileView profile={profile} />);

    expect(container.querySelector("main")).toHaveAttribute("data-motion", "reduced");
    expect(screen.getByRole("heading", { name: "Industrial Safety VR Trainer" })).toBeVisible();
    expect(screen.getByRole("link", { name: /employer inquiry for avery chen/i })).toBeVisible();
  });
});

describe("student profile route states", () => {
  it("shows a non-disclosing profile-specific not-found state", () => {
    render(<StudentProfileNotFound />);
    expect(screen.getByRole("heading", { name: /student profile.*not available/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to talent index/i })).toHaveAttribute("href", "/talent");
    expect(document.body).not.toHaveTextContent(/unpublished|private|hidden/i);
  });

  it("shows a recoverable database error state", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<StudentProfileError error={new Error("database unavailable")} reset={reset} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
