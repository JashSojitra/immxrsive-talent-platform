import { describe, expect, test } from "vitest";

import {
  professionalLinkId,
  projectAssetId,
  skillIdForName,
} from "@/fixtures/ids";

describe("deterministic fixture identifiers", () => {
  test("the same source values always create the same identifiers", () => {
    expect(skillIdForName("C#")).toBe(skillIdForName("C#"));
    expect(professionalLinkId("S01", "github")).toBe(
      professionalLinkId("S01", "github"),
    );
    expect(projectAssetId("P01", "demo")).toBe(
      projectAssetId("P01", "demo"),
    );
  });

  test("different exact skill names remain independent", () => {
    expect(skillIdForName("C#")).not.toBe(skillIdForName("C++"));
  });
});
