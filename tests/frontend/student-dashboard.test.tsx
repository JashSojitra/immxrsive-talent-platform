// @vitest-environment jsdom
import "./setup";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const { requireAuthenticatedUser, verification, profile, relationships } = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(), verification: vi.fn(), profile: vi.fn(), relationships: vi.fn(),
}));
vi.mock("@/auth/server", () => ({ requireAuthenticatedUser, getStudentVerificationStatus: verification, getInternalUserId: (user: { id: string }) => user.id }));
vi.mock("@/db/runtime", () => ({ getRuntimeDatabase: () => ({}) }));
vi.mock("@/profile/service", () => ({ getPrivateStudentProfile: profile }));
vi.mock("@/projects/service", () => ({ listProjectRelationships: relationships }));
vi.mock("@/components/auth/SignOutButton", () => ({ SignOutButton: () => <button>Sign out</button> }));
import StudentDashboardPage from "@/app/student/dashboard/page";

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthenticatedUser.mockResolvedValue({ id: "account-1", name: "Synthetic Student", email: "student@example.com" });
  verification.mockResolvedValue({ status: "verified", institutionalEmail: "student@algomau.ca" });
  profile.mockResolvedValue({ id: "profile-1", headline: "Creative developer", biography: "My work", skillIds: ["skill-1"], publicationStatus: "unpublished" });
  relationships.mockResolvedValue([]);
});

test("dashboard counts accepted work separately from pending invitations", async () => {
  relationships.mockResolvedValue([
    { id: "owned", title: "Owned project", state: "accepted", isMaintainer: true, publicationStatus: "published", pendingMaintenance: false },
    { id: "invited", title: "Invited project", state: "pending", isMaintainer: false, publicationStatus: "published", pendingMaintenance: false },
    { id: "removed", title: "Past project", state: "removed", isMaintainer: false, publicationStatus: "published", pendingMaintenance: false },
  ]);
  render(await StudentDashboardPage());
  expect(screen.getByRole("link", { name: "Owned project" })).toHaveAttribute("href", "/student/projects/owned/edit");
  expect(screen.queryByRole("link", { name: "Invited project" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Past project" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "You have 1 invitation or offer to review" })).toBeInTheDocument();
  expect(screen.getByText("1 published · 0 private")).toBeInTheDocument();
  expect(screen.getByRole("progressbar", { name: "Profile foundations complete" })).toHaveAttribute("value", "5");
});

test("an unverified account gets verification, never student project access", async () => {
  verification.mockResolvedValue({ status: "unverified" });
  render(await StudentDashboardPage());
  expect(profile).not.toHaveBeenCalled();
  expect(relationships).not.toHaveBeenCalled();
  for (const link of screen.getAllByRole("link", { name: /Verify affiliation/ })) expect(link).toHaveAttribute("href", "/student/verify");
  expect(screen.queryByRole("link", { name: /Create project/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Edit profile/ })).not.toBeInTheDocument();
});

test("a saved private profile is never presented as publicly discoverable", async () => {
  render(await StudentDashboardPage());
  const overview = screen.getByRole("region", { name: "Workspace overview" });
  expect(within(overview).getByText("Private")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "View public portfolio" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Preview profile" })).toHaveAttribute("href", "/student/profile/preview");
});
