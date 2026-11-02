import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { safeEvidenceUrl, mayEmbedDemo } from "@/projects/evidence-url";
import { projectDraftSchema } from "@/projects/validation";
describe("deployment-compatible evidence boundaries", () => {
  test("embedding is confined to the reviewed fixture and static providers, with no application-page embedding", () => {
    const origin="https://studio.example.com";
    for(const url of ["/fixtures/r3/working_demo.html",`${origin}/fixtures/r3/working_demo.html`,"https://qa.github.io/demo","https://html-classic.itch.zone/html/demo"]) expect(mayEmbedDemo(url,origin)).toBe(true);
    for(const url of [`${origin}/student/profile/edit`,"https://qa.github.io.evil.com/demo","https://evil.com/fixtures/r3/working_demo.html","/fixtures/r3/fallback.svg","javascript:alert(1)"]) expect(mayEmbedDemo(url,origin)).toBe(false);
  });
  test("official fixtures are copied byte-for-byte into public static paths", () => {
    for(const name of ["working_demo.html","fallback.svg"]) expect(readFileSync(`public/fixtures/r3/${name}`)).toEqual(readFileSync(`Release 3 Fixtures-20261030/${name}`));
  });
  test("only exact reviewed relative paths are accepted", () => {
    for(const url of ["/fixtures/r3/working_demo.html","/fixtures/r3/fallback.svg"]) expect(safeEvidenceUrl(url)).toBe(url);
    for(const url of ["//evil.com/x","/student/profile/edit","/fixtures/r3/../working_demo.html","/fixtures/r3/working_demo.html?x=1","data:text/html,test","file:///demo","https://user:pw@host.com/a","https://localhost./x","https://127.0.0.1/x","https://[::1]/x","https://2130706433/x","https://example.local/x"]) expect(safeEvidenceUrl(url)).toBeNull();
  });
  test("structured fixture media persist separately without permitting raw iframe markup", () => {
    expect(projectDraftSchema.parse({title:"Evidence",description:"",domain:"XR",media:[{kind:"playable",url:"/fixtures/r3/working_demo.html",label:"Demo"},{kind:"fallback_image",url:"/fixtures/r3/fallback.svg",label:"Alternate",altText:"Diagram"}]}).media).toHaveLength(2);
    expect(projectDraftSchema.safeParse({title:"Evidence",domain:"XR",media:[{kind:"playable",url:"<iframe src=x>",label:"Unsafe"}]}).success).toBe(false);
  });
});
