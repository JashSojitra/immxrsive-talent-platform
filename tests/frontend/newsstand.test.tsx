// @vitest-environment jsdom
import "./setup";
import { expect, test, vi } from "vitest";
import * as THREE from "three";
import { buildNewsstand } from "@/components/world/engine/buildings";
test("newsstand shares one 1024px atlas, bounds geometry and adds no lights",()=>{
  const fillText=vi.fn();const context={fillRect:vi.fn(),fillText,measureText:(s:string)=>({width:s.length*15})};
  vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue(context as never);
  const b=buildNewsstand(Array.from({length:8},(_,i)=>({title:`Test paper ${i}`,date:"2026-11-26",excerpt:"Test excerpt",href:`/updates/test-${i}`})));
  let triangles=0,lights=0;const maps=new Set<THREE.Texture>();b.group.traverse(o=>{if(o instanceof THREE.Light) lights++;if(o instanceof THREE.Mesh){triangles+=(o.geometry.index?.count ?? o.geometry.getAttribute("position").count)/3;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){if("map" in m && m.map instanceof THREE.Texture) maps.add(m.map);}}});
  expect(triangles).toBeLessThanOrEqual(3000);expect(lights).toBe(0);expect(maps.size).toBe(1);expect(([...maps][0].image as HTMLCanvasElement).width).toBe(1024);expect(fillText.mock.calls.map(c=>c[0])).not.toContain("Test paper 5");
});
