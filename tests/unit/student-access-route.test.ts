import { beforeEach, describe, expect, test, vi } from "vitest";

const { getAuthenticatedUser, getStudentVerificationStatus, redirect } = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getStudentVerificationStatus: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/auth/server", () => ({
  getAuthenticatedUser,
  getStudentVerificationStatus,
}));

import StudentAccessPage from "@/app/student/page";

describe("student access gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("sends signed-out visitors to GitHub sign-in", async () => {
    getAuthenticatedUser.mockResolvedValue(null);

    await expect(StudentAccessPage()).rejects.toThrow(
      "NEXT_REDIRECT:/student/sign-in",
    );
    expect(getStudentVerificationStatus).not.toHaveBeenCalled();
  });

  test("sends an unverified student to affiliation verification", async () => {
    getAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    getStudentVerificationStatus.mockResolvedValue({ status: "unverified" });

    await expect(StudentAccessPage()).rejects.toThrow(
      "NEXT_REDIRECT:/student/verify",
    );
    expect(getStudentVerificationStatus).toHaveBeenCalledWith("user-1");
  });

  test("sends a verified student to their dashboard", async () => {
    getAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    getStudentVerificationStatus.mockResolvedValue({ status: "verified" });

    await expect(StudentAccessPage()).rejects.toThrow(
      "NEXT_REDIRECT:/student/dashboard",
    );
  });
});
