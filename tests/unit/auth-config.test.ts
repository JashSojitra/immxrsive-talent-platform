import { describe, expect, test } from "vitest";

import {
  DEFAULT_AUTH_CALLBACK_PATH,
  GITHUB_OAUTH_SCOPES,
  GITHUB_PROVIDER_ID,
  normalizeAuthCallbackPath,
} from "@/auth/config";

describe("authentication configuration", () => {
  test("requests the minimum GitHub login scope without repository access", () => {
    expect(GITHUB_PROVIDER_ID).toBe("github");
    expect(GITHUB_OAUTH_SCOPES).toEqual(["user:email"]);
    expect(GITHUB_OAUTH_SCOPES).not.toContain("repo");
    expect(GITHUB_OAUTH_SCOPES).not.toContain("public_repo");
  });

  test.each([
    [undefined, DEFAULT_AUTH_CALLBACK_PATH],
    [null, DEFAULT_AUTH_CALLBACK_PATH],
    ["https://attacker.example/steal", DEFAULT_AUTH_CALLBACK_PATH],
    ["//attacker.example/steal", DEFAULT_AUTH_CALLBACK_PATH],
    ["javascript:alert(1)", DEFAULT_AUTH_CALLBACK_PATH],
    ["/student/dashboard", "/student/dashboard"],
    ["/student/dashboard?tab=identity", "/student/dashboard?tab=identity"],
  ])("normalizes callback %s safely", (value, expected) => {
    expect(normalizeAuthCallbackPath(value)).toBe(expected);
  });
});
