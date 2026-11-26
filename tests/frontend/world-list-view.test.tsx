// @vitest-environment jsdom
import "./setup";
import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { WorldListView } from "@/components/world/WorldExperience";
import { places } from "@/components/world/world-content";

test("the accessible list view renders every place with its real content", () => {
  render(<WorldListView />);
  expect(screen.getByRole("heading", { level: 1, name: "ImmXrsive World" })).toBeInTheDocument();
  for (const place of places) expect(screen.getByRole("heading", { level: 2, name: place.title })).toBeInTheDocument();

  const stories = screen.getByRole("list", { name: "Student stories" });
  expect(within(stories).queryByText("Jash Sojitra")).toBeNull();
  expect(screen.getByText("News coming soon")).toBeVisible();
  expect(within(stories).getAllByText("Story coming soon").length).toBeGreaterThan(0);

  const showcase = screen.getByRole("list", { name: "Showcase projects" });
  for (const name of ["SYNC", "Canon DNA", "Project Nexus"]) expect(within(showcase).getByText(name)).toBeInTheDocument();
  expect(within(showcase).getByText("Coming soon")).toBeInTheDocument();

  expect(screen.getByRole("img", { name: /QR code that opens the ImmXrsive platform/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Algoma University/ })).toHaveAttribute("rel", "noopener noreferrer");
});
