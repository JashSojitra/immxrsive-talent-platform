import { expect, test, vi } from "vitest";
import type { Database } from "@/db/client";
import { createContextualInquiry } from "@/db/queries/inquiry";

test.each(["-".repeat(36),"a".repeat(36),"12345678-1234-1234-1234-12345678901-"])("malformed partner ID %s never reaches a UUID database comparison",async sourceId=>{
 const select=vi.fn(()=>{throw new Error("invalid UUID reached database");});
 const db={transaction:async (callback:(tx:unknown)=>unknown)=>callback({select})} as unknown as Database;
 expect(await createContextualInquiry(db,{sourceType:"partner",sourceId,companyName:"Synthetic",contactName:"Contact",contactEmail:"contact@example.test",description:"A synthetic collaboration inquiry.",website:""})).toBeNull();
 expect(select).not.toHaveBeenCalled();
});
