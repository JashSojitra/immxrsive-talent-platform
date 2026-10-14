// @vitest-environment jsdom

import "./setup";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  parseTalentFilters,
  serializeTalentFilters,
  TalentDirectory,
} from "@/components/talent/TalentDirectory";

const metadata = {
  skills: [
    { value: "Unity", label: "Unity" },
    { value: "React", label: "React" },
  ],
  availability: [
    { value: "internship", label: "Internship" },
    { value: "contract", label: "Contract" },
  ],
  status: [
    { value: "current", label: "Current" },
    { value: "alumni", label: "Alumni" },
  ],
};

const avery = {
  id: "S01",
  name: "Avery Chen",
  headline: "XR Developer focused on training simulations",
  status: "current" as const,
  skills: ["Unity", "C#", "OpenXR"],
  availability: ["internship" as const],
  projectEvidenceCount: 2,
};

const maya = {
  id: "S02",
  name: "Maya Patel",
  headline: "3D Artist and technical artist",
  status: "current" as const,
  skills: ["Unity", "Blender"],
  availability: ["internship" as const, "contract" as const],
  projectEvidenceCount: 2,
};

function json(value: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  }));
}

function mockApi(talent = { items: [avery, maya], count: 2 }) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/api/v1/skills")) return json(metadata);
    return json(talent);
  });
}

describe("talent directory", () => {
  beforeEach(() => {
    window.__IMMXRSIVE_DISABLE_MOTION__ = true;
    window.history.replaceState(null, "", "/talent");
  });

  it("renders API results, count, required card evidence, and stable profile links", async () => {
    mockApi();
    render(<TalentDirectory />);

    expect(screen.getByRole("heading", { name: /discover the people/i })).toBeInTheDocument();
    expect(await screen.findByText("Avery Chen")).toBeInTheDocument();
    expect(screen.getByText("XR Developer focused on training simulations")).toBeInTheDocument();
    expect(screen.getAllByText("Unity").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Internship").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Project evidence").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("2 matches")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Avery Chen's profile" })).toHaveAttribute("href", "/students/S01");
    expect(screen.getByRole("heading", { name: /one field.*many dimensions/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /talent is more than.*a list of skills/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /find the person.*behind the possibility/i })).toBeInTheDocument();
  });

  it("submits search to the API and serializes it into the URL", async () => {
    const fetchMock = mockApi({ items: [maya], count: 1 });
    const user = userEvent.setup();
    render(<TalentDirectory />);
    await screen.findByText("Maya Patel");

    const search = screen.getByRole("searchbox", { name: /search talent/i });
    await user.type(search, "Maya");
    await user.click(screen.getByRole("button", { name: /submit talent search/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/talent?q=Maya",
      expect.objectContaining({ cache: "no-store" }),
    ));
    expect(window.location.search).toBe("?q=Maya");
    expect(screen.getByRole("button", { name: /remove search: maya filter/i })).toBeInTheDocument();
  });

  it("keeps advanced expressions shareable through the existing q parameter", async () => {
    const fetchMock = mockApi({ items: [avery], count: 1 });
    const user = userEvent.setup();
    render(<TalentDirectory />);
    await screen.findByText("Avery Chen");

    await user.type(screen.getByRole("searchbox", { name: /search talent/i }), 'React | TypeScript, "Machine Learning"');
    await user.click(screen.getByRole("button", { name: /submit talent search/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/talent?q=React+%7C+TypeScript%2C+%22Machine+Learning%22",
      expect.any(Object),
    ));
    expect(parseTalentFilters(window.location.search).q).toBe('React | TypeScript, "Machine Learning"');
  });

  it("opens accessible search tips by hover, click, keyboard, Escape, and outside click", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<TalentDirectory />);
    await screen.findByText("Avery Chen");
    const help = screen.getByRole("button", { name: "Search tips" });
    expect(help).toHaveAttribute("type", "button");
    expect(help).toHaveAttribute("aria-expanded", "false");

    await user.hover(help);
    expect(screen.getByRole("region", { name: "Search tips" })).toBeInTheDocument();
    expect(screen.getByText("Match BOTH keywords.")).toBeInTheDocument();
    await user.unhover(help);
    await user.hover(screen.getByRole("region", { name: "Search tips" }));
    expect(screen.getByRole("region", { name: "Search tips" })).toBeInTheDocument();

    await user.click(help);
    expect(help).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "Search tips" })).not.toBeInTheDocument();
    expect(help).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("region", { name: "Search tips" })).toBeInTheDocument();
    await user.click(screen.getByRole("heading", { name: /discover the people/i }));
    expect(screen.queryByRole("region", { name: "Search tips" })).not.toBeInTheDocument();
  });

  it("shows malformed search feedback inline and preserves valid results", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/v1/skills")) return json(metadata);
      if (url.includes("q=React%2C")) {
        return json({ error: {
          code: "INVALID_QUERY",
          message: "One or more directory filters are invalid.",
          details: [{ field: "q", code: "EMPTY_SEARCH_TERM", message: "Add a keyword after the final separator." }],
        } }, 400);
      }
      return json({ items: [avery, maya], count: 2 });
    });
    const user = userEvent.setup();
    render(<TalentDirectory />);
    expect(await screen.findByText("Avery Chen")).toBeInTheDocument();

    const search = screen.getByRole("searchbox", { name: /search talent/i });
    await user.type(search, "React,");
    await user.click(screen.getByRole("button", { name: /submit talent search/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Add a keyword after the final separator.");
    expect(search).toHaveValue("React,");
    expect(search).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Avery Chen")).toBeInTheDocument();
    expect(screen.queryByText("No matching students.")).not.toBeInTheDocument();
  });

  it("supports multiple API-backed filters, individual removal, and Clear All", async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();
    render(<TalentDirectory />);
    await screen.findByText("Avery Chen");

    await user.click(screen.getByRole("checkbox", { name: "Unity" }));
    await user.click(screen.getByRole("checkbox", { name: "Contract" }));
    await user.click(screen.getByRole("checkbox", { name: "Alumni" }));

    await waitFor(() => expect(window.location.search).toContain("skill=Unity"));
    expect(window.location.search).toContain("availability=contract");
    expect(window.location.search).toContain("status=alumni");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/talent?skill=Unity&availability=contract&status=alumni",
      expect.objectContaining({ cache: "no-store" }),
    );

    await user.click(screen.getByRole("button", { name: /remove contract filter/i }));
    expect(window.location.search).not.toContain("availability");
    await user.click(screen.getByRole("button", { name: /^clear all$/i }));
    expect(window.location.search).toBe("");
    expect(screen.getByRole("checkbox", { name: "Unity" })).not.toBeChecked();
  });

  it("restores repeated filter values from a reload-safe query", async () => {
    const fetchMock = mockApi();
    render(<TalentDirectory initialSearch="skill=Unity&skill=React&availability=contract&status=current" />);
    await screen.findByText("Avery Chen");

    expect(screen.getByRole("checkbox", { name: "Unity" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "React" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Contract" })).toBeChecked();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/talent?skill=Unity&skill=React&availability=contract&status=current",
      expect.any(Object),
    );
  });

  it("shows a deliberate empty state while retaining filters, then clears them", async () => {
    mockApi({ items: [], count: 0 });
    const user = userEvent.setup();
    render(<TalentDirectory initialSearch="skill=Unity" />);

    expect(await screen.findByRole("heading", { name: "No matching students." })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Unity" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: /clear all filters/i }));
    expect(screen.getByRole("checkbox", { name: "Unity" })).not.toBeChecked();
  });

  it("shows a recoverable backend error instead of an empty directory", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input).includes("/api/v1/skills")) return json(metadata);
      return json({ error: { message: "Signal unavailable" } }, 500);
    });
    const user = userEvent.setup();
    render(<TalentDirectory />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Signal unavailable");
    expect(screen.queryByText("No matching students.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("keeps search and filters keyboard operable when Three.js is unavailable", async () => {
    Reflect.deleteProperty(window, "THREE");
    mockApi();
    const user = userEvent.setup();
    render(<TalentDirectory />);
    await screen.findByText("Avery Chen");

    await user.tab();
    expect(screen.getByRole("link", { name: /skip to talent directory/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: /directory home/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: /^talent index$/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: /student login \/ create profile/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: /enter the field/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Search tips" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("searchbox", { name: /search talent/i })).toHaveFocus();
    screen.getByRole("checkbox", { name: "Unity" }).focus();
    await user.keyboard(" ");
    expect(screen.getByRole("checkbox", { name: "Unity" })).toBeChecked();
  });

  it("keeps every chapter and the directory functional when GSAP does not initialize", async () => {
    window.__IMMXRSIVE_DISABLE_MOTION__ = true;
    mockApi();
    const user = userEvent.setup();
    const { container } = render(<TalentDirectory />);

    expect(await screen.findByText("Avery Chen")).toBeInTheDocument();
    expect(container.querySelector("main")).toHaveAttribute("data-motion", "fallback");
    expect(screen.getByText("Spatial Computing")).toBeInTheDocument();
    expect(screen.getByText(/shared projects, real contributor roles/i)).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Alumni" }));
    expect(screen.getByRole("checkbox", { name: "Alumni" })).toBeChecked();
  });

  it("moves focus to the stable result summary when a focused card disappears", async () => {
    window.__IMMXRSIVE_DISABLE_MOTION__ = true;
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/v1/skills")) return json(metadata);
      return json(url.includes("q=Maya") ? { items: [maya], count: 1 } : { items: [avery, maya], count: 2 });
    });
    render(<TalentDirectory />);
    const averyLink = await screen.findByRole("link", { name: "View Avery Chen's profile" });
    averyLink.focus();
    expect(averyLink).toHaveFocus();

    window.history.pushState(null, "", "/talent?q=Maya");
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() => expect(screen.getByLabelText("1 match")).toHaveFocus());
    expect(screen.queryByRole("link", { name: "View Avery Chen's profile" })).not.toBeInTheDocument();
  });

  it("settles all content immediately when reduced motion is requested", async () => {
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
    mockApi();
    const { container } = render(<TalentDirectory />);
    expect(await screen.findByText("Avery Chen")).toBeInTheDocument();
    expect(container.querySelector("main")).toHaveAttribute("data-motion", "reduced");
    expect(screen.getByRole("heading", { name: /the spatial field becomes.*a searchable index/i })).toBeInTheDocument();
  });
});

describe("talent URL helpers", () => {
  it("round-trips multi-valued filters without collapsing them", () => {
    const filters = parseTalentFilters("?q=xr&skill=Unity&skill=React&availability=contract&status=alumni");
    expect(filters.skill).toEqual(["Unity", "React"]);
    expect(serializeTalentFilters(filters)).toBe("q=xr&skill=Unity&skill=React&availability=contract&status=alumni");
  });

  it("round-trips commas, pipes, and quotes in q", () => {
    const q = 'React | TypeScript, "Machine Learning"';
    const serialized = serializeTalentFilters({ ...EMPTY_FILTERS_FOR_TEST, q });
    expect(parseTalentFilters(`?${serialized}`).q).toBe(q);
  });
});

const EMPTY_FILTERS_FOR_TEST = { q: "", skill: [], availability: [], status: [] };
