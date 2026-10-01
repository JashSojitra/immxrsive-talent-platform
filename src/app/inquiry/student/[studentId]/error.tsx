"use client";

import { InquiryRouteError } from "@/components/inquiry/InquiryRouteState";

export default function StudentInquiryError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <InquiryRouteError reset={reset} />;
}
