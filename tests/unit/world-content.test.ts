import { expect, test } from "vitest";

import { latLonToUnit, places, tourOrder } from "@/components/world/world-content";

test("every world place is unique, on the planet and part of the tour", () => {
  const ids = places.map(place => place.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect([...tourOrder].sort()).toEqual([...ids].sort());
  for (const place of places) {
    expect(place.lat).toBeGreaterThanOrEqual(-90);
    expect(place.lat).toBeLessThanOrEqual(90);
    expect(Math.abs(place.lon)).toBeLessThanOrEqual(180);
  }
});

test("world links are either internal routes or HTTPS pages opened as external", () => {
  for (const place of places) {
    for (const link of place.links) {
      if (link.external) expect(link.href).toMatch(/^https:\/\//);
      else expect(link.href).toMatch(/^\/[a-z/-]*$/);
    }
  }
});

test("stories and showcase never invent content: unknown slots are explicit placeholders", () => {
  const stories = places.find(place => place.id === "stories")!.stories!;
  const students = stories.filter(story => story.kind === "student");
  expect(students.map(story => story.name)).toEqual(["Jash Sojitra"]);
  expect(stories.filter(story => story.kind === "coming-soon").length).toBeGreaterThan(0);

  const showcase = places.find(place => place.id === "showcase")!.showcase!;
  const projects = showcase.filter(item => item.kind === "project");
  expect(projects.map(item => item.name)).toEqual(["SYNC", "Canon DNA", "Project Nexus"]);
  // Project Nexus has no approved summary yet, so it must not carry one.
  expect(projects.find(item => item.name === "Project Nexus")).not.toHaveProperty("summary");
});

test("latitude/longitude map to unit vectors with the hub on the north pole", () => {
  const [x, y, z] = latLonToUnit(90, 0);
  expect(x).toBeCloseTo(0);
  expect(y).toBeCloseTo(1);
  expect(z).toBeCloseTo(0);
  for (const place of places) {
    const v = latLonToUnit(place.lat, place.lon);
    expect(Math.hypot(...v)).toBeCloseTo(1);
  }
});
