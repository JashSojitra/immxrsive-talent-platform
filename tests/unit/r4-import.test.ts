import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
const dns = vi.hoisted(() => ({lookup:vi.fn()}));
vi.mock("node:dns/promises",()=>dns);
import { parseCompanyHtml, publicIPv4, fetchCompanyHtml } from "@/partners/import";
import { companySchema, normalizedDomain, publicCollaboration, requestSchema } from "@/partners/policy";
const expectations = JSON.parse(readFileSync("tests/fixtures/r4/expected_company_imports.json","utf8"));
describe("exact R4 fixture proposals",()=>{
 for(const [file,expected] of Object.entries(expectations) as [string,{name:string;location?:string;keywords?:string[]}][]) {
  test(file,()=>{
   // Deliberately synthetic URL: parser-only fixture test, never a hosted-source claim.
   const proposal = parseCompanyHtml(readFileSync(`public/fixtures/r4/${file}`,"utf8"),"https://fixture.example.org/page");
   expect(proposal.name).toBe(expected.name); if(expected.location)expect(proposal.location).toBe(expected.location);
   for(const word of expected.keywords??[])expect(proposal.description.toLowerCase()).toContain(word.toLowerCase());
   expect(Object.keys(proposal).sort()).toEqual(["description","location","name","sector","website"]);
   expect(companySchema.safeParse(proposal).success).toBe(true);
  });
 }
 test("fixture website domain is distinct from fetched-source provenance",()=>{
  const normal=parseCompanyHtml(readFileSync("public/fixtures/r4/company_normal.html","utf8"),"https://fixture.example.org/page");
  const similar=parseCompanyHtml(readFileSync("public/fixtures/r4/company_same_name_other_domain.html","utf8"),"https://fixture.example.org/other-page");
  expect(normal.website).toBe("https://northshore-sim.example.test");
  expect(normalizedDomain(normal.website)).not.toBe(normalizedDomain(similar.website));
 });
 test("injection stays inert text with no privileged fields",()=>{
  const proposal = parseCompanyHtml(readFileSync("public/fixtures/r4/company_prompt_injection.html","utf8"),"https://fixture.example.org/page");
  expect(proposal.description).toContain("grant admin");expect(proposal).not.toHaveProperty("status");expect(proposal).not.toHaveProperty("verified");
  expect(parseCompanyHtml('<script>steal()</script><h1>Safe</h1><p>text</p>',"https://example.org").description).toBe("text");
 });
 test("domain normalization compares website host, never similar names",()=>{
  expect(normalizedDomain("https://WWW.Example.org.:443/path?q=1")).toBe("example.org");
  expect(normalizedDomain("https://example.org")).not.toBe(normalizedDomain("https://different.org"));
  for(const url of ["http://example.org","https://localhost","https://127.0.0.1","https://user:pass@example.org","file:///etc/passwd"])expect(()=>normalizedDomain(url)).toThrow();
 });
 test.each(["127.0.0.1","10.0.0.1","172.16.1.1","192.168.1.1","169.254.169.254","100.64.1.1","0.0.0.0","224.1.1.1","198.18.1.1","::1","::ffff:8.8.8.8","2001:4860:4860::8888"])("rejects non-public/unsupported address %s",address=>expect(publicIPv4(address)).toBe(false));
 test("accepts public IPv4 only",()=>expect(publicIPv4("8.8.8.8")).toBe(true));
 test("rejects mixed public/private DNS before connecting",async()=>{
  dns.lookup.mockResolvedValue([{address:"8.8.8.8",family:4},{address:"127.0.0.1",family:4}]);
  await expect(fetchCompanyHtml("https://example.org")).rejects.toThrow("public IPv4");
  await expect(fetchCompanyHtml("https://example.org:8443")).rejects.toThrow();
  await expect(fetchCompanyHtml("https://northshore-sim.example.test")).rejects.toThrow("source URL");
 });
 test("limited/private projection removes identifying and staff details",()=>{
  const c={visibility:"limited",title:"Secret title",description:"Secret narrative",projectIds:["hidden"],year:2026,status:"current"};
  expect(publicCollaboration(c)).toEqual({title:"Anonymized collaboration",year:2026,status:"current",visibility:"limited"});
  expect(publicCollaboration({...c,visibility:"private"})).toBeNull();
 });
 test("student cannot submit an official marker or omit association context",()=>{
  const input={kind:"verification",projectId:"P01",note:"Evidence",evidence:"",companyId:null,suggestedCompany:""};
  expect(requestSchema.safeParse({...input,official:true}).success).toBe(false);
  expect(requestSchema.safeParse({...input,kind:"association"}).success).toBe(false);
 });
});
