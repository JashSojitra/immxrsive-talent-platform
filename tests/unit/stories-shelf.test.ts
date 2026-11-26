import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

const shelf = readFileSync(new URL("../../public/world/stories-shelf.html", import.meta.url), "utf8");

test("the Stories House shelf keeps the MIT attribution and loads three.js locally", () => {
  expect(shelf).toContain("@designcodeio/threeui@1.2.0, MIT License, Copyright (c) 2026 Meng To");
  expect(shelf).not.toContain("cdn.jsdelivr.net");
  for (const file of [
    "build/three.module.min.js",
    "examples/jsm/controls/OrbitControls.js",
    "examples/jsm/environments/RoomEnvironment.js",
    "examples/jsm/geometries/RoundedBoxGeometry.js",
    "examples/jsm/lights/RectAreaLightUniformsLib.js",
  ]) expect(existsSync(new URL(`../../public/world/vendor/three-0.165.0/${file}`, import.meta.url))).toBe(true);
});

test("the shelf shows only real student content and explicit placeholders", () => {
  for (const name of ["Codex", "Claude Code", "Cursor", "Antigravity", "Figma", "Framer", "Xcode", "Working Volumes"]) {
    expect(shelf).not.toContain(name);
  }
  expect(shelf).toContain('"title": "Jash Sojitra"');
  expect(shelf).toContain('"photo": "/world/students/jash-sojitra.jpg"');
  expect(shelf.match(/"title": "Coming Soon"/g)).toHaveLength(6);
  expect(shelf).toContain('const COVER_ATLAS_DATA = "";');
  expect(existsSync(new URL("../../public/world/students/jash-sojitra.jpg", import.meta.url))).toBe(true);
});
