import { DetailPage } from "@/studio/DetailPage";
export const dynamic = "force-dynamic";
export const metadata = { title: "My showcase request", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ projectId: string }> }) { return <DetailPage projectId={(await params).projectId} />; }
