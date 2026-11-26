import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

import { isSoftwareRendererName } from "@/components/world/engine/software-renderer";

test("CPU rasterizers are recognised so the world starts at its lightest quality", () => {
  for (const name of [
    "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
    "Google SwiftShader",
    "llvmpipe (LLVM 15.0.7, 256 bits)",
    "softpipe",
    "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)",
  ]) expect(isSoftwareRendererName(name), name).toBe(true);
});

test("real GPUs keep full quality", () => {
  for (const name of [
    "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "Apple M2",
    "Mali-G78",
  ]) expect(isSoftwareRendererName(name), name).toBe(false);
});

test("the Stories House shelf falls back to its static catalog on the same renderers", () => {
  const shelf = readFileSync(resolve("public/world/stories-shelf.html"), "utf8");
  expect(shelf).toContain("/swiftshader|llvmpipe|softpipe|software|basic render driver|microsoft basic render/i.test(rendererName)");
});
