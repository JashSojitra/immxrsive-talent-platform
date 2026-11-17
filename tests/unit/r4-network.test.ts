import { beforeEach, expect, test, vi } from "vitest";
const upstream=vi.hoisted(()=>({status:200,type:"text/html; charset=utf-8",encoding:"identity",body:"<h1>Company</h1>",pinned:"",lookupHost:"",destroyed:false}));
vi.mock("node:dns/promises",()=>({lookup:vi.fn(async()=>[{address:"8.8.8.8",family:4}])}));
vi.mock("node:https",async()=>{
 const {EventEmitter}=await import("node:events");
 return {request:vi.fn((_url:URL,options:{lookup:(host:string,options:object,cb:(err:unknown,ip:string,family:number)=>void)=>void},callback:(res:unknown)=>void)=>{
  const req=Object.assign(new EventEmitter(),{destroy(error:Error){upstream.destroyed=true;queueMicrotask(()=>{req.emit("error",error);req.emit("close");});return req;},end(){queueMicrotask(()=>{
   options.lookup("example.org",{},(_error,address)=>{upstream.pinned=address;});
   const res=Object.assign(new EventEmitter(),{statusCode:upstream.status,headers:{"content-type":upstream.type,"content-encoding":upstream.encoding},destroy(){upstream.destroyed=true;req.emit("close");}});
   callback(res); if(!upstream.destroyed){res.emit("data",Buffer.from(upstream.body));res.emit("end");req.emit("close");}
  });return req;}});return req;
 })};
});
import {fetchCompanyHtml} from "@/partners/import";
beforeEach(()=>Object.assign(upstream,{status:200,type:"text/html; charset=utf-8",encoding:"identity",body:"<h1>Company</h1>",pinned:"",destroyed:false}));
test("pins validated DNS IP while retaining original HTTPS URL",async()=>{expect(await fetchCompanyHtml("https://example.org")).toBe(upstream.body);expect(upstream.pinned).toBe("8.8.8.8");});
test.each([302,301,404,500])("does not follow response %s",async status=>{upstream.status=status;await expect(fetchCompanyHtml("https://example.org")).rejects.toThrow("redirects are not followed");expect(upstream.destroyed).toBe(true);});
test("rejects non-HTML and compressed responses",async()=>{upstream.type="application/json";await expect(fetchCompanyHtml("https://example.org")).rejects.toThrow("HTML");upstream.type="text/html";upstream.encoding="gzip";await expect(fetchCompanyHtml("https://example.org")).rejects.toThrow("HTML");});
test("caps response bytes before returning a proposal",async()=>{upstream.body="x".repeat(512001);await expect(fetchCompanyHtml("https://example.org")).rejects.toThrow("500 KB");});
