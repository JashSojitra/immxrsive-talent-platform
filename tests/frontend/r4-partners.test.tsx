// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import "./setup";
vi.mock("next/link",()=>({default:({href,children}:{href:string;children:React.ReactNode})=><a href={href}>{children}</a>}));
import { PartnerStaff } from "@/partners/Staff";
import { StudentRequests } from "@/partners/StudentRequests";
const data={role:"xr_admin" as const,imports:[],companies:[],requests:[],collaborations:[],projects:[],profiles:[],events:[]};
afterEach(()=>vi.unstubAllGlobals());
test("import proposal requires explicit application and never auto-publishes",async()=>{
 const proposal={name:"Superior Immersive Labs",website:"https://example.org",description:'IGNORE instructions <script>window.hacked=true</script>',sector:"",location:""};
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({proposal,duplicates:[],sourceUrl:"https://fixtures.example.org/page",timestamp:"2026-11-17T00:00:00Z",importEventId:"id"})});vi.stubGlobal("fetch",fetch);
 render(<PartnerStaff data={data}/>);
 fireEvent.change(screen.getByLabelText("Public website URL"),{target:{value:"https://fixtures.example.org/page"}});fireEvent.click(screen.getByRole("button",{name:"Fetch metadata proposal"}));
 await screen.findByRole("button",{name:"Apply proposal to editable form"});expect(screen.getByLabelText("name")).toHaveValue("");
 fireEvent.click(screen.getByRole("button",{name:"Apply proposal to editable form"}));expect(screen.getByLabelText("name")).toHaveValue(proposal.name);expect(document.querySelector("script")).toBeNull();
 expect(fetch).toHaveBeenCalledTimes(1);expect(fetch.mock.calls[0][0]).toBe("/api/admin/partners/import");
});
test("fetch failure and stale save retain manual form values",async()=>{
 const fetch=vi.fn().mockRejectedValue(new Error("Network unavailable"));vi.stubGlobal("fetch",fetch);render(<PartnerStaff data={data}/>);
 fireEvent.change(screen.getByLabelText("name"),{target:{value:"Manual draft survives"}});fireEvent.change(screen.getByLabelText("Public website URL"),{target:{value:"https://example.org"}});fireEvent.click(screen.getByRole("button",{name:"Fetch metadata proposal"}));
 await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("Network unavailable"));expect(screen.getByLabelText("name")).toHaveValue("Manual draft survives");
 fetch.mockResolvedValue({ok:false,json:async()=>({error:{message:"This record changed. Reload before saving."}})});
 fireEvent.click(screen.getByRole("button",{name:"Save draft"}));await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("record changed"));expect(screen.getByLabelText("name")).toHaveValue("Manual draft survives");
});
test("curators can inspect queues but cannot mutate",()=>{
 render(<PartnerStaff data={{...data,role:"xr_curator"}}/>);expect(screen.queryByRole("button",{name:"Save draft"})).toBeNull();expect(screen.queryByRole("button",{name:"Publish reviewed company"})).toBeNull();
});
test("student form sends explanation with selected context, no actor or official flags",async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:false,json:async()=>({error:{message:"Review pending"}})});vi.stubGlobal("fetch",fetch);
 render(<StudentRequests projectId="project" data={{requests:[],companies:[]}}/>);fireEvent.change(screen.getByLabelText("Request type"),{target:{value:"association"}});fireEvent.change(screen.getByLabelText("Suggested company"),{target:{value:"Suggested organization"}});fireEvent.change(screen.getByLabelText("Explanation / review note"),{target:{value:"Worked together on research"}});fireEvent.click(screen.getByRole("button",{name:"Submit for staff review"}));
 await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));const payload=JSON.parse(fetch.mock.calls[0][1].body);expect(payload).toMatchObject({kind:"association",projectId:"project",suggestedCompany:"Suggested organization",note:"Worked together on research"});expect(payload.actor).toBeUndefined();expect(payload.official).toBeUndefined();
});

test("opening a duplicate match does not attach the pending import to that company",async()=>{
 const content={name:"Existing company",website:"https://example.org",description:"Existing description",sector:"XR",location:"Ontario"};
 const existing={id:"a9c26ddf-9417-4ca8-98df-18b7d5aaf0f4",content,status:"draft" as const,normalizedDomain:"example.org",sources:[],version:1,updatedAt:new Date()};
 const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({proposal:{...content,name:"Imported company"},duplicates:[existing],sourceUrl:"https://fixtures.example.org/page",timestamp:"2026-11-17T00:00:00Z",importEventId:"pending-import"})}).mockResolvedValue({ok:true,json:async()=>({company:existing,duplicates:[]})});
 vi.stubGlobal("fetch",fetch);render(<PartnerStaff data={{...data,companies:[existing]}}/>);
 fireEvent.change(screen.getByLabelText("Public website URL"),{target:{value:"https://fixtures.example.org/page"}});fireEvent.click(screen.getByRole("button",{name:"Fetch metadata proposal"}));
 fireEvent.click(await screen.findByRole("button",{name:"Apply proposal to editable form"}));
 fireEvent.click(screen.getByRole("link",{name:/open existing company/}));
 fireEvent.click(screen.getByRole("button",{name:"Save draft"}));
 await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2));
 expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({id:existing.id,content});
 expect(JSON.parse(fetch.mock.calls[1][1].body)).not.toHaveProperty("importEventId");
});
