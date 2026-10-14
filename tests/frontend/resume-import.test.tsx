// @vitest-environment jsdom

import "./setup";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ProfileEditor } from "@/components/student-editor/ProfileEditor";

const vocabulary = {
  skills: [{ id: "unity", name: "Unity" }, { id: "react", name: "React" }],
  availability: [{ value: "internship" as const, label: "Internship" }],
};

const initialProfile = {
  id: "profile-1",
  publicationStatus: "unpublished" as const,
  headline: "Manually maintained headline",
  biography: "Manual biography",
  publicLocation: "Sault Ste. Marie, ON",
  program: "Computer Science",
  studentStatus: "current" as const,
  showAvailability: false,
  showProfessionalLinks: false,
  showPublicLocation: false,
  showEducation: false,
  showExperience: false,
  skillIds: ["react"],
  availability: ["internship" as const],
  linkedinUrl: "",
  githubUrl: "",
  externalLinks: [],
  education: ["Existing education"],
  experience: ["Existing experience"],
  createdAt: "2026-10-12T12:00:00.000Z",
  updatedAt: "2026-10-12T12:00:00.000Z",
  publishedAt: null,
  revision: "2026-10-12T12:00:00.000Z",
};

const extracted = {
  candidates: {
    skills: [{ id: "skill-0", skillId: "unity", value: "Unity", source: "Unity" }],
    unsupportedSkills: ["Tailwind CSS"],
    education: [{ id: "education-0", value: "Algoma University", source: "Education source" }],
    experience: [{ id: "experience-0", value: "XR assistant", source: "Experience source" }],
    links: [{
      id: "link-0", type: "github", label: "GitHub", value: "https://github.com/student",
      url: "https://github.com/student", source: "github.com/student",
    }],
  },
};

describe("resume import review", () => {
  test("does not change manual data until approved candidates are explicitly applied", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(extracted), { status: 200 }))
      .mockImplementationOnce(async (_input, init) => {
        const payload = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({
          profile: {
            ...initialProfile,
            ...payload,
            updatedAt: "2026-10-12T13:00:00.000Z",
          },
        }), { status: 200 });
      });
    const user = userEvent.setup();
    renderEditor();

    const file = new File(["%PDF-1.7\n%%EOF"], "resume.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("PDF resume"), file);
    await user.click(screen.getByRole("button", { name: "Review resume" }));

    expect(await screen.findByText("Review every candidate before applying changes.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Unsupported resume skills" })).toBeVisible();
    expect(screen.getByText("Tailwind CSS")).toBeVisible();
    expect(screen.getByText(/will not be added automatically/i)).toBeVisible();
    expect(screen.getByLabelText("Professional headline")).toHaveValue("Manually maintained headline");
    expect(screen.getByLabelText("Education entry 1")).toHaveValue("Existing education");

    const educationEdit = screen.getByDisplayValue("Algoma University");
    await user.clear(educationEdit);
    await user.type(educationEdit, "Edited Algoma education");
    const experienceCard = screen.getByText("Source: Experience source").closest("article");
    if (!experienceCard) throw new Error("Expected experience candidate card.");
    await user.click(within(experienceCard).getByRole("radio", { name: "Reject" }));
    await user.click(screen.getByRole("button", { name: "Apply approved changes" }));

    expect(await screen.findByText("Approved resume candidates were saved to your private draft.")).toBeVisible();
    const saveCall = fetchMock.mock.calls[1];
    expect(saveCall?.[0]).toBe("/api/v1/student/profile/me");
    const payload = JSON.parse(String((saveCall?.[1] as RequestInit).body));
    expect(payload.headline).toBe("Manually maintained headline");
    expect(payload.skillIds).toEqual(["react", "unity"]);
    expect(payload.education).toEqual(["Existing education", "Edited Algoma education"]);
    expect(payload.experience).toEqual(["Existing experience"]);
    expect(payload.githubUrl).toBe("https://github.com/student");
  });

  test("cancel and extraction failure preserve all existing fields", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(extracted), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: "The uploaded file is not a readable PDF resume." },
      }), { status: 422 }));
    const user = userEvent.setup();
    renderEditor();
    const input = screen.getByLabelText("PDF resume");
    await user.upload(input, new File(["pdf"], "first.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: "Review resume" }));
    await screen.findByText("Review every candidate before applying changes.");
    await user.click(screen.getByRole("button", { name: "Cancel review" }));
    expect(screen.getByText("Resume review cancelled. Your profile was not changed.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Professional headline")).toHaveValue("Manually maintained headline");

    await user.upload(input, new File(["bad"], "bad.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: "Review resume" }));
    expect(await screen.findByText(/not a readable PDF/i)).toBeVisible();
    expect(screen.getByLabelText("Education entry 1")).toHaveValue("Existing education");
  });

  test("replace mode changes only profile fields represented by extracted candidates", async () => {
    const minimalCandidates = {
      candidates: {
        skills: [],
        unsupportedSkills: [],
        education: [{ id: "education-0", value: "New education", source: "Education source" }],
        experience: [],
        links: [],
      },
    };
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(minimalCandidates), { status: 200 }))
      .mockImplementationOnce(async (_input, init) => new Response(JSON.stringify({
        profile: {
          ...initialProfile,
          ...JSON.parse(String(init?.body)),
          updatedAt: "2026-10-12T13:00:00.000Z",
        },
      }), { status: 200 }));
    const user = userEvent.setup();
    renderEditor();

    await user.upload(screen.getByLabelText("PDF resume"),
      new File(["%PDF-1.7\n%%EOF"], "minimal.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: "Review resume" }));
    await screen.findByText("Review every candidate before applying changes.");
    await user.click(screen.getByRole("radio", { name: "Replace represented profile fields" }));
    await user.click(screen.getByRole("button", { name: "Apply approved changes" }));

    const payload = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body));
    expect(payload.education).toEqual(["New education"]);
    expect(payload.skillIds).toEqual(["react"]);
    expect(payload.experience).toEqual(["Existing experience"]);
  });
});

function renderEditor() {
  return render(<ProfileEditor
    initialProfile={initialProfile}
    vocabulary={vocabulary}
    githubIdentity={{ name: "Student", email: "student@example.test" }}
  />);
}
