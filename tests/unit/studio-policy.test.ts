import { describe, expect, test } from "vitest";
import { authorizeCommand, showcaseVisibility, commandSchema, contentSchema, states, type Command, type Role } from "@/studio/policy";
const command = (action: Command["action"]): Command => ({ action, version: 1, note: "Explanation" });
describe("XR least privilege and transitions", () => {
  test.each(states)("ordinary unrelated user cannot change %s requests", state => {
    for (const action of ["review", "suggest", "accept", "approve", "publish", "moderate", "withdraw"] as const) expect(() => authorizeCommand(state, command(action), false, null)).toThrow();
  });
  test.each(["xr_curator", "xr_admin", "platform_super_admin"] as Role[])("%s cannot impersonate owner consent", role => {
    for (const action of ["accept", "withdraw", "resubmit"] as const) expect(() => authorizeCommand("approved", command(action), false, role)).toThrow("FORBIDDEN");
  });
  test.each(["publish", "moderate"] as const)("curators cannot %s", action => expect(() => authorizeCommand("approved", command(action), false, "xr_curator")).toThrow("FORBIDDEN"));
  test.each(["request_changes", "reject", "suggest", "moderate"] as const)("%s needs an owner-visible explanation", action => expect(() => authorizeCommand("under_review", { ...command(action), note: "" }, false, "xr_admin")).toThrow("REASON_REQUIRED"));
  test("owners can withdraw but cannot approve a review", () => {
    expect(() => authorizeCommand("approved", command("withdraw"), true, null)).not.toThrow();
    expect(() => authorizeCommand("under_review", command("approve"), true, null)).toThrow("FORBIDDEN");
  });
  test("withdrawn content must be resubmitted before review or publication", () => {
    expect(() => authorizeCommand("withdrawn", command("resubmit"), true, null)).not.toThrow();
    for (const action of ["publish", "approve", "review", "suggest"] as const) expect(() => authorizeCommand("withdrawn", command(action), false, "xr_admin")).toThrow("INVALID_TRANSITION");
  });
  test("review cannot skip submission or approve twice", () => {
    expect(() => authorizeCommand("submitted", command("approve"), false, "xr_curator")).toThrow("INVALID_TRANSITION");
    expect(() => authorizeCommand("approved", command("approve"), false, "xr_admin")).toThrow("INVALID_TRANSITION");
  });
  test.each([{ role: "platform_super_admin" }, { ownerUserId: "forged" }, { published: true }, { acceptedBy: "forged" }])("rejects client privilege and ownership fields %j", extra => {
    expect(commandSchema.safeParse({ ...command("accept"), ...extra }).success).toBe(false);
  });
  test.each(["javascript:alert(1)", "http://example.com", "https://127.0.0.1", "https://user:pass@example.com", "https://foo.internal/demo"])("unsafe showcase URL %s", mediaUrl => expect(contentSchema.safeParse({ title: "XR", summary: "Evidence", mediaUrl, demoUrl: "" }).success).toBe(false));
});

test("effective showcase visibility invalidates approval on project edits, transfer or unpublication", () => {
  const s = { published: true, state: "approved", contentVersion: 2, acceptedVersion: 2, acceptedBy: "owner", acceptedProjectVersion: 5 };
  const p = { maintainerUserId: "owner", version: 5, publicationStatus: "published" };
  expect(showcaseVisibility(s, p)).toEqual({ ownerApprovalCurrent: true, effectivePublished: true });
  expect(showcaseVisibility(s, { ...p, version: 6 })).toEqual({ ownerApprovalCurrent: false, effectivePublished: false });
  expect(showcaseVisibility(s, { ...p, maintainerUserId: "new-owner" })).toEqual({ ownerApprovalCurrent: false, effectivePublished: false });
  expect(showcaseVisibility(s, { ...p, publicationStatus: "unpublished" }).effectivePublished).toBe(false);
});
