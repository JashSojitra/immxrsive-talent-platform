import type { Metadata } from "next";
import Link from "next/link";

import { requireVerifiedStudent } from "@/auth/server";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ProfileEditor } from "@/components/student-editor/ProfileEditor";
import { getRuntimeDatabase } from "@/db/runtime";
import {
  getPrivateStudentProfile,
  getProfileEditorVocabulary,
} from "@/profile/service";

import authStyles from "../../auth.module.css";

export const metadata: Metadata = {
  title: "Edit private student profile",
  description: "Create and maintain your private NOT ImmXrsive student profile draft.",
};

export const dynamic = "force-dynamic";

export default async function StudentProfileEditorPage() {
  const { user } = await requireVerifiedStudent("/student/profile/edit");
  const db = getRuntimeDatabase();
  const [profile, vocabulary] = await Promise.all([
    getPrivateStudentProfile(db, user.id),
    getProfileEditorVocabulary(db),
  ]);
  const serializableProfile = profile ? {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    publishedAt: profile.publishedAt?.toISOString() ?? null,
    revision: profile.updatedAt.toISOString(),
  } : null;

  return (
    <div className={authStyles.shell}>
      <nav className={authStyles.nav} aria-label="Student profile editor">
        <BrandLogo className={authStyles.brand} />
        <Link className={authStyles.backLink} href="/student/dashboard">Dashboard</Link>
      </nav>
      <ProfileEditor
        initialProfile={serializableProfile}
        vocabulary={vocabulary}
        githubIdentity={{ name: user.name, email: user.email }}
      />
    </div>
  );
}
