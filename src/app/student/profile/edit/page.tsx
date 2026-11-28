import { AvatarEditor } from "@/updates/MediaUpload";
import { eq } from "drizzle-orm";
import { studentProfiles } from "@/db/schema";
import type { Metadata } from "next";
import Link from "next/link";

import { requireVerifiedStudent } from "@/auth/server";
import { ProfileEditor } from "@/components/student-editor/ProfileEditor";
import { getRuntimeDatabase } from "@/db/runtime";
import {
  getPrivateStudentProfile,
  getProfileEditorVocabulary,
} from "@/profile/service";

import authStyles from "../../auth.module.css";

export const metadata: Metadata = {
  title: "Edit private student profile",
  description: "Create and maintain your private ImmXrsive student profile draft.",
};

export const dynamic = "force-dynamic";

export default async function StudentProfileEditorPage() {
  const { user } = await requireVerifiedStudent("/student/profile/edit");
  const db = getRuntimeDatabase();
  const [profile, vocabulary] = await Promise.all([
    getPrivateStudentProfile(db, user.id),
    getProfileEditorVocabulary(db),
  ]);
  const [photo] = await db.select({ id: studentProfiles.avatarMediaId }).from(studentProfiles).where(eq(studentProfiles.ownerUserId, user.id));
  const serializableProfile = profile ? {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    publishedAt: profile.publishedAt?.toISOString() ?? null,
    revision: profile.updatedAt.toISOString(),
  } : null;

  return (
    <main className={authStyles.shell}>
      <nav className={`${authStyles.nav} ${authStyles.profileNav}`} aria-label="Student profile editor">
        <Link className={authStyles.backLink} href="/student/dashboard">Dashboard</Link> <Link className={authStyles.backLink} href="/student/projects">My Projects</Link>
      </nav>
      {profile && <AvatarEditor initialId={photo?.id ?? null} />}
      <ProfileEditor
        initialProfile={serializableProfile}
        vocabulary={vocabulary}
        githubIdentity={{ name: user.name, email: user.email }}
      />
    </main>
  );
}
