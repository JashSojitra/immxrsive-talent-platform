// @vitest-environment jsdom

import "./setup";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { GitHubSignInButton } from "@/components/auth/GitHubSignInButton";
import { SignOutButton } from "@/components/auth/SignOutButton";

const { routerRefresh, routerReplace, signInSocial, signOut } = vi.hoisted(() => ({
  routerRefresh: vi.fn(),
  routerReplace: vi.fn(),
  signInSocial: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh, replace: routerReplace }),
}));

vi.mock("@/auth/client", () => ({
  authClient: {
    signIn: { social: signInSocial },
    signOut,
  },
}));

describe("student authentication controls", () => {
  beforeEach(() => {
    signInSocial.mockReset();
    signOut.mockReset();
    routerRefresh.mockReset();
    routerReplace.mockReset();
  });

  test("starts GitHub sign-in from the keyboard without adding scopes", async () => {
    signInSocial.mockResolvedValue({ data: { redirect: true }, error: null });
    const user = userEvent.setup();
    render(<GitHubSignInButton configured callbackURL="/student/dashboard" />);

    await user.tab();
    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(signInSocial).toHaveBeenCalledWith({
      provider: "github",
      callbackURL: "/student/dashboard",
      errorCallbackURL: "/student/sign-in?error=oauth",
    });
    expect(signInSocial.mock.calls[0]?.[0]).not.toHaveProperty("scopes");
  });

  test("disables provider sign-in when server configuration is absent", () => {
    render(<GitHubSignInButton configured={false} callbackURL="/student/dashboard" />);
    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeDisabled();
  });

  test("reports a safe provider-start failure", async () => {
    signInSocial.mockRejectedValue(new Error("provider details that must not leak"));
    const user = userEvent.setup();
    render(<GitHubSignInButton configured callbackURL="/student/dashboard" />);

    await user.click(screen.getByRole("button", { name: "Continue with GitHub" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "GitHub sign-in could not be started. Please try again.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("provider details");
  });

  test("calls the server-backed sign-out endpoint and reports failures", async () => {
    signOut.mockResolvedValue({ data: null, error: { message: "internal" } });
    const user = userEvent.setup();
    render(<SignOutButton />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sign out failed. Please try again.",
    );
    expect(routerReplace).not.toHaveBeenCalled();
  });

  test("returns to sign-in after a successful sign-out", async () => {
    signOut.mockResolvedValue({ data: { success: true }, error: null });
    const user = userEvent.setup();
    render(<SignOutButton />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(routerReplace).toHaveBeenCalledWith("/student/sign-in");
    expect(routerRefresh).toHaveBeenCalledOnce();
  });
});
