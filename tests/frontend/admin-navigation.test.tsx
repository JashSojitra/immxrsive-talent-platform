// @vitest-environment jsdom
import "./setup";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/projects/new" }));
import { AdminNavigation } from "@/admin/AdminNavigation";

test("admin navigation highlights the specific destination and shows eligible actions", () => {
  render(<AdminNavigation role="platform_super_admin" />);
  expect(screen.getByRole("link", { name: "Create project" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "Project library" })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("link", { name: "Staff access" })).toBeInTheDocument();
});

test("curator navigation omits write and role administration actions", () => {
  render(<AdminNavigation role="xr_curator" />);
  expect(screen.queryByRole("link", { name: "Create project" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Staff access" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Project library" })).toBeInTheDocument();
});
