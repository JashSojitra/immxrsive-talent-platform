// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { Box3, Mesh, type ExtrudeGeometry } from "three";
import { expect, test } from "vitest";
import { createXRMark, disposeXRMark, XR_MARK_URL } from "@/components/spatial/xr-mark";

test("official XR paths become real closed solids with the original silhouette and proportions", () => {
  const svg = readFileSync(`public${XR_MARK_URL}`, "utf8");
  const mark = createXRMark(svg);
  const meshes: Mesh<ExtrudeGeometry>[] = [];
  mark.traverse(object => { if (object instanceof Mesh) meshes.push(object as Mesh<ExtrudeGeometry>); });
  // Five distinct interleaved hexagonal outlines plus the original R and X letterforms.
  expect(meshes).toHaveLength(7);
  const box = new Box3().setFromObject(mark);
  expect(box.max.z - box.min.z).toBeGreaterThan(.1);
  expect(box.max.y - box.min.y).toBeCloseTo(3.54, 1);
  expect((box.max.x - box.min.x) / (box.max.y - box.min.y)).toBeCloseTo(111.09 / 124.75, 2);
  expect(Math.abs(box.max.x + box.min.x)).toBeLessThan(.001);
  expect(Math.abs(box.max.y + box.min.y)).toBeLessThan(.001);
  let triangles = 0;
  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute("position");
    triangles += position.count / 3;
    for (let i = 0; i < position.count; i++) expect(Number.isFinite(position.getX(i))).toBe(true);
    // Each outline must retain its interior opening, rather than becoming a filled hexagon.
    if (meshes.indexOf(mesh) < 5) {
      const shapes = mesh.geometry.parameters.shapes;
      expect((Array.isArray(shapes) ? shapes[0] : shapes).holes).toHaveLength(1);
    }
  }
  expect(triangles).toBeLessThan(5000);
  disposeXRMark(mark);
});
