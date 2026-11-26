import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

import { XR_ICON_PATHS, XR_ICON_VIEWBOX } from "@/components/world/engine/xr-icon";
import { places } from "@/components/world/world-content";

const normalise = (d: string) => d.replace(/\s+/g, " ").trim();

test("the 3D XR Hub uses the official XR icon artwork unchanged", () => {
  const svg = readFileSync(new URL("../../public/branding/immxrsive-icon-reverse.svg", import.meta.url), "utf8");
  const official = [...svg.matchAll(/\sd="([^"]+)"/g)].map(match => normalise(match[1]));
  expect(XR_ICON_PATHS.map(normalise)).toEqual(official);
  expect(svg).toContain(`viewBox="${XR_ICON_VIEWBOX}"`);
});

test("the world's centre is the XR Hub, not an abstract X", () => {
  const hub = places.find(place => place.id === "hub")!;
  expect(hub.name).toBe("XR Hub");
  expect(places.some(place => place.name === "The X")).toBe(false);
});
