// @vitest-environment jsdom

import "./setup";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ProfileEditor } from "@/components/student-editor/ProfileEditor";

const vocabulary = {
  skills: [{ id: "unity", name: "Unity" }, { id: "figma", name: "Figma" }],
  availability: [
    { value: "internship" as const, label: "Internship" },
    { value: "full-time" as const, label: "Full Time" },
  ],
};

describe("private student profile editor", () => {
  test("creates a structured private draft from keyboard-accessible controls", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      profile: {
        id: "profile-1",
        publicationStatus: "unpublished",
        headline: "XR developer",
        biography: "Accessible simulations",
        publicLocation: "Sault Ste. Marie, ON",
        skillIds: ["unity"],
        availability: ["internship"],
        linkedinUrl: "",
        githubUrl: "",
        externalLinks: [],
        createdAt: "2026-10-12T12:00:00.000Z",
        updatedAt: "2026-10-12T12:00:00.000Z",
      },
    }), { status: 201 }));
    const user = userEvent.setup();
    render(<ProfileEditor initialProfile={null} vocabulary={vocabulary}
      githubIdentity={{ name: "Student", email: "student@example.test" }} />);

    await user.type(screen.getByLabelText("Professional headline"), "XR developer");
    await user.type(screen.getByLabelText("Biography"), "Accessible simulations");
    await user.type(screen.getByLabelText("Public location"), "Sault Ste. Marie, ON");
    await user.click(screen.getByRole("checkbox", { name: "Unity" }));
    await user.click(screen.getByRole("checkbox", { name: "Internship" }));
    const save = screen.getByRole("button", { name: "Create private draft" });
    save.focus();
    await user.keyboard("{Enter}");

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/student/profile/me", expect.objectContaining({
      method: "POST",
      body: expect.not.stringContaining("ownerUserId"),
    }));
    expect(await screen.findByText("Private draft saved.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  test("preserves edits and exposes server validation after a failed save", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      error: {
        message: "Review the highlighted profile fields.",
        details: [{ field: "githubUrl", message: "GitHub link must use github.com." }],
      },
    }), { status: 422 }));
    const user = userEvent.setup();
    render(<ProfileEditor initialProfile={null} vocabulary={vocabulary}
      githubIdentity={{ name: "Student", email: "student@example.test" }} />);

    const headline = screen.getByLabelText("Professional headline");
    await user.type(headline, "Keep this edit");
    await user.type(screen.getByLabelText("GitHub profile URL"), "https://gitlab.com/student");
    await user.click(screen.getByRole("button", { name: "Create private draft" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("github.com");
    expect(headline).toHaveValue("Keep this edit");
    expect(document.querySelector('[data-tone="error"]')).toHaveTextContent("Review the highlighted profile fields.");
  });

  test("renders biography markup as textarea text and sends only editable fields", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      profile: {
        id: "profile-1", publicationStatus: "unpublished", headline: "Updated",
        biography: "<script>safe text</script>", publicLocation: "", skillIds: [],
        availability: [], linkedinUrl: "", githubUrl: "", externalLinks: [],
        education: [], experience: [],
        createdAt: "2026-10-12T12:00:00.000Z", updatedAt: "2026-10-12T13:00:00.000Z",
      },
    }), { status: 200 }));
    const user = userEvent.setup();
    render(<ProfileEditor vocabulary={vocabulary} githubIdentity={{ name: "Student", email: "student@example.test" }}
      initialProfile={{
        id: "profile-1", publicationStatus: "unpublished", headline: "Before",
        biography: "<script>safe text</script>", publicLocation: "", program: "",
        studentStatus: null, showAvailability: false, showProfessionalLinks: false,
        showPublicLocation: false, showEducation: false, showExperience: false, skillIds: [],
        availability: [], linkedinUrl: "", githubUrl: "", externalLinks: [],
        education: [], experience: [],
        createdAt: "2026-10-12T12:00:00.000Z", updatedAt: "2026-10-12T12:00:00.000Z",
        publishedAt: null,
        revision: "2026-10-12T12:00:00.000Z",
      }} />);
    expect(screen.getByLabelText("Biography")).toHaveValue("<script>safe text</script>");
    expect(document.querySelector("script")).toBeNull();
    await user.clear(screen.getByLabelText("Professional headline"));
    await user.type(screen.getByLabelText("Professional headline"), "Updated");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("publicationStatus");
    expect(payload).not.toHaveProperty("createdAt");
    expect(payload).not.toHaveProperty("updatedAt");
  });

  test("keeps publication explicit, blocks it while dirty, and sends the saved revision", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const savedProfile = {
        id: "profile-1", publicationStatus: "published", headline: "XR developer",
        biography: "Accessible simulations", publicLocation: "", program: "Computer Science",
        studentStatus: "current", showAvailability: false, showProfessionalLinks: false,
        showPublicLocation: false, showEducation: false, showExperience: false,
        skillIds: ["unity"], availability: [], linkedinUrl: "", githubUrl: "",
        externalLinks: [], education: [], experience: [],
        createdAt: "2026-10-12T12:00:00.000Z", updatedAt: "2026-10-12T13:00:00.000Z",
        publishedAt: "2026-10-12T13:00:00.000Z",
      } as const;
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        profile: { ...savedProfile, publicationStatus: "unpublished", publishedAt: null },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ profile: savedProfile }), { status: 200 }));
    render(<ProfileEditor vocabulary={vocabulary}
      githubIdentity={{ name: "Student", email: "student@example.test" }}
      initialProfile={completeInitialProfile()} />);

    expect(screen.getByRole("link", { name: "Preview saved public profile" }))
      .toHaveAttribute("href", "/student/profile/preview");
    const publish = screen.getByRole("button", { name: "Publish profile" });
    await user.type(screen.getByLabelText("Professional headline"), " updated");
    expect(publish).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await user.click(screen.getByRole("button", { name: "Publish profile" }));

    expect(window.confirm).toHaveBeenCalledOnce();
    const publicationCall = fetchMock.mock.calls[1];
    expect(publicationCall?.[0]).toBe("/api/v1/student/profile/publication");
    expect(JSON.parse(String((publicationCall?.[1] as RequestInit).body))).toEqual({
      action: "publish",
      revision: "2026-10-12T13:00:00.000Z",
    });
    expect(await screen.findByText("Profile published. It is now available in public discovery."))
      .toBeVisible();
    expect(screen.getByRole("button", { name: "Unpublish profile" })).toBeEnabled();
  });

  test("shows server publication requirements without publishing", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      error: {
        code: "PUBLICATION_VALIDATION",
        message: "Complete the required public profile fields before publishing.",
        details: [{ field: "program", message: "Add your program before publishing." }],
      },
    }), { status: 422 }));
    const user = userEvent.setup();
    render(<ProfileEditor vocabulary={vocabulary}
      githubIdentity={{ name: "Student", email: "student@example.test" }}
      initialProfile={{ ...completeInitialProfile(), program: "" }} />);
    await user.click(screen.getByRole("button", { name: "Publish profile" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Add your program");
    expect(screen.getByText("Complete the required public profile fields before publishing."))
      .toBeVisible();
  });

  test("persists allowlisted presentation, media, and keyboard-operable section ordering", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({
        profile: {
          ...completeInitialProfile(), ...body,
          updatedAt: "2026-10-12T14:00:00.000Z",
        },
      }), { status: 200 });
    });
    const user = userEvent.setup();
    render(<ProfileEditor vocabulary={vocabulary}
      githubIdentity={{ name: "Student", email: "student@example.test" }}
      initialProfile={completeInitialProfile()} />);

    await user.click(screen.getByRole("radio", { name: /Editorial/ }));
    await user.click(screen.getByRole("radio", { name: /Prismatic plane/ }));
    const moveSkillsUp = screen.getByRole("button", { name: "Move Skills up" });
    moveSkillsUp.focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const payload = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(payload).toMatchObject({
      presentationPreset: "editorial",
      heroMedia: "prism",
      sectionOrder: ["skills", "about", "background", "links"],
    });
    expect(payload).not.toHaveProperty("publicationStatus");
    expect(await screen.findByText("Private draft saved.")).toBeVisible();
  });
});

function completeInitialProfile() {
  return {
    id: "profile-1", publicationStatus: "unpublished" as const, headline: "XR developer",
    biography: "Accessible simulations", publicLocation: "", program: "Computer Science",
    studentStatus: "current" as const, showAvailability: false, showProfessionalLinks: false,
    showPublicLocation: false, showEducation: false, showExperience: false,
    skillIds: ["unity"], availability: [], linkedinUrl: "", githubUrl: "", externalLinks: [],
    education: [], experience: [], createdAt: "2026-10-12T12:00:00.000Z",
    updatedAt: "2026-10-12T12:00:00.000Z", revision: "2026-10-12T12:00:00.000Z",
    publishedAt: null,
    presentationPreset: "spatial" as const,
    heroMedia: "default" as const,
    sectionOrder: ["about", "skills", "background", "links"] as Array<
      "about" | "skills" | "background" | "links"
    >,
  };
}
