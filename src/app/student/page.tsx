import { redirect } from "next/navigation";

import { getAuthenticatedUser, getStudentVerificationStatus } from "@/auth/server";

export default async function StudentAccessPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/student/sign-in");

  const affiliation = await getStudentVerificationStatus(user.id);
  redirect(affiliation.status === "verified" ? "/student/dashboard" : "/student/verify");
}
