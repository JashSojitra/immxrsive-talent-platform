"use client";

import { InquiryRouteError } from "@/components/inquiry/InquiryRouteState";

export default function ProjectInquiryError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <InquiryRouteError reset={reset} />;
}
