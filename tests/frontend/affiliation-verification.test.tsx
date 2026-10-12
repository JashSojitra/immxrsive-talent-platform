// @vitest-environment jsdom

import "./setup";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { AffiliationVerificationPanel } from "@/components/auth/AffiliationVerificationPanel";

const { routerRefresh, routerReplace } = vi.hoisted(() => ({
  routerRefresh: vi.fn(),
  routerReplace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh, replace: routerReplace }),
}));

describe("affiliation verification panel", () => {
  beforeEach(() => {
    routerRefresh.mockReset();
    routerReplace.mockReset();
    vi.restoreAllMocks();
  });

  test("submits a normalized verification request through the authenticated API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "sent" }), { status: 202 }),
    );
    const user = userEvent.setup();
    render(<AffiliationVerificationPanel initialStatus={{
      status: "unverified", institutionalEmail: null, verifiedAt: null,
    }} />);

    const input = screen.getByRole("textbox", { name: "Algoma University email" });
    await user.type(input, "student@algomau.ca");
    await user.click(screen.getByRole("button", { name: "Send verification link" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/student/verification/request",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "student@algomau.ca" }),
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Verification email sent");
  });

  test("confirms a link from the keyboard and renders persisted identity", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      status: "verified",
      institutionalEmail: "student@algomau.ca",
      verifiedAt: "2026-10-11T18:00:00.000Z",
    }), { status: 200 }));
    const user = userEvent.setup();
    render(<AffiliationVerificationPanel
      initialStatus={{ status: "unverified", institutionalEmail: null, verifiedAt: null }}
      token="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    />);

    const confirm = screen.getByRole("button", { name: "Verify affiliation" });
    confirm.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByText("student@algomau.ca")).toBeVisible();
    expect(screen.getByText("Affiliation confirmed")).toBeVisible();
    expect(routerReplace).toHaveBeenCalledWith("/student/verify");
    expect(routerRefresh).toHaveBeenCalledOnce();
  });

  test("shows safe expired or reused-link errors from the API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      error: { code: "EXPIRED_TOKEN", message: "This verification link has expired. Request a new link." },
    }), { status: 410 }));
    const user = userEvent.setup();
    render(<AffiliationVerificationPanel
      initialStatus={{ status: "unverified", institutionalEmail: null, verifiedAt: null }}
      token="BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
    />);
    await user.click(screen.getByRole("button", { name: "Verify affiliation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("verification link has expired");
    expect(screen.getByRole("button", { name: "Send verification link" })).toBeEnabled();
  });

  test("renders an already-verified account without another request form", () => {
    render(<AffiliationVerificationPanel initialStatus={{
      status: "verified",
      institutionalEmail: "verified@algomau.ca",
      verifiedAt: new Date("2026-10-11T18:00:00.000Z"),
    }} />);
    expect(screen.getByText("verified@algomau.ca")).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to dashboard" })).toHaveAttribute(
      "href",
      "/student/dashboard",
    );
  });
});
