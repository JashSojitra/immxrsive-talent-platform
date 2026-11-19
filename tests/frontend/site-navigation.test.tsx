// @vitest-environment jsdom
import "./setup";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteNavigation } from "@/components/layout/SiteNavigation";

const location = vi.hoisted(() => ({ pathname: "/projects/P01" }));
vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }));

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
});

describe("shared navigation", () => {
  it("marks the parent destination active on deep routes without marking home", () => {
    render(<SiteNavigation accountLinks={[{ href: "/student/sign-in", label: "Student sign in" }]} />);
    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(navigation).getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    expect(within(navigation).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("opens a labeled mobile dialog and restores focus when closed", async () => {
    const user = userEvent.setup();
    render(<SiteNavigation accountLinks={[{ href: "/student/sign-in", label: "Student sign in" }]} />);
    const trigger = screen.getByRole("button", { name: "Open navigation menu" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Explore ImmXrsive" });
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByRole("link", { name: "Staff / Admin Portal" })).toHaveAttribute("href", "/admin");
    await user.click(within(dialog).getByRole("button", { name: "Close navigation menu" }));
    expect(dialog).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();
  });

  it("keeps both eligible workspaces in the mobile menu and closes after choosing one", async () => {
    const user = userEvent.setup();
    render(<SiteNavigation accountLinks={[{ href: "/student/dashboard", label: "Student Dashboard" }, { href: "/admin", label: "Admin Dashboard" }]} />);
    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "Student Dashboard" })).toHaveAttribute("href", "/student/dashboard");
    expect(within(dialog).getByRole("link", { name: "Admin Dashboard" })).toHaveAttribute("href", "/admin");
    expect(within(dialog).queryByRole("link", { name: "Staff / Admin Portal" })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("link", { name: "Admin Dashboard" }));
    expect(dialog).not.toHaveAttribute("open");
  });
});

