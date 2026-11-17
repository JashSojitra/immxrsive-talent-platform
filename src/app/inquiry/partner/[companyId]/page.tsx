import { notFound } from "next/navigation";
import { getRuntimeDatabase } from "@/db/runtime";
import { publicPartner } from "@/partners/service";
import { InquiryPage } from "@/components/inquiry/InquiryPage";
export const dynamic = "force-dynamic";
export default async function PartnerInquiry({params}:{params:Promise<{companyId:string}>}) {
 const company = await publicPartner(getRuntimeDatabase(),(await params).companyId); if(!company) notFound();
 return <InquiryPage source={{type:"partner",id:company.id,name:company.content.name,detail:"Industry collaboration inquiry",sourceUrl:`/partners/${company.id}`}}/>;
}
