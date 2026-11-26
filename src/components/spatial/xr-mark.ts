import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

export const XR_MARK_URL = "/branding/immxrsive-icon-reverse.svg";

/** Extrude the authorised paths unchanged; no font, traced approximation or replacement frame. */
export function createXRMark(svg: string) {
  const data = new SVGLoader().parse(svg);
  // SVGLoader returns the root SVG element (the installed type declares XMLDocument).
  const viewBox = (data.xml as unknown as Element).getAttribute("viewBox")!.split(/[ ,]+/).map(Number);
  const [x, y, width, height] = viewBox;
  const scale = 3.6 / height;
  const front = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: .28, roughness: .24, clearcoat: .7, clearcoatRoughness: .2 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x582c83, metalness: .65, roughness: .3 });
  const source = new THREE.Group();
  for (const path of data.paths) {
    const shapes = SVGLoader.createShapes(path);
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: 5, bevelEnabled: false, curveSegments: 12, steps: 1,
    });
    // No bevel: even the thin official outline paths keep their exact front silhouette.
    source.add(new THREE.Mesh(geometry, [front, edge]));
  }
  source.scale.set(scale, -scale, scale);
  source.position.set(-(x + width / 2) * scale, (y + height / 2) * scale, -2.5 * scale);
  const mark = new THREE.Group();
  mark.add(source);
  return mark;
}

export function disposeXRMark(mark: THREE.Group) {
  const materials = new Set<THREE.Material>();
  mark.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  for (const material of materials) material.dispose();
}
