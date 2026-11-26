// @vitest-environment jsdom
import "./setup";
import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { StudentStories } from "@/components/home/StudentStories";
import { studentStories, placeById } from "@/components/world/world-content";

test("homepage and world share approved stories with explicit unknown slots", () => {
  expect(placeById("stories").stories).toBe(studentStories);
  render(<StudentStories />);
  const list = screen.getByRole("list", { name: "Student stories" });
  expect(within(list).getByRole("img", { name: "Jash Sojitra" })).toHaveAttribute("alt", "Jash Sojitra");
  expect(list).toHaveTextContent("Developer of this platform · XR Program & Partnership Student Coordinator");
  expect(list).toHaveTextContent("Built this platform and the ImmXrsive World.");
  expect(within(list).getByRole("link", { name: "Meet Jash Sojitra" })).toHaveAttribute("href", "https://www.linkedin.com/in/jashsojitra/");
  expect(within(list).getAllByRole("heading", { name: "Story coming soon" })).toHaveLength(2);
  expect(within(list).getAllByRole("link")).toHaveLength(1);
});
