// @vitest-environment jsdom
import "./setup";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("@/auth/auth", () => ({ isGitHubAuthConfigured: true }));
vi.mock("@/auth/server", () => ({ getAuthenticatedUser: async () => null }));
vi.mock("@/components/auth/GitHubSignInButton", () => ({ GitHubSignInButton: () => <button>Continue with GitHub</button> }));
import StudentSignInPage from "@/app/student/sign-in/page";

test("student access heading remains release-neutral", async () => {
  render(await StudentSignInPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByText("Student access", { exact: true })).toBeInTheDocument();
  expect(screen.queryByText(/Release \d/i)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeInTheDocument();
});
