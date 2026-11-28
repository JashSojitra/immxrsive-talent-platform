import "server-only";
import { sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { countPublishedTalent } from "@/db/queries/talent";
import { publicCompanies } from "@/partners/service";
import { listPublicProjects } from "@/projects/public-directory";
import { articleStudent, publicArticles } from "@/updates/service";

async function loadSection<T>(
  db: Database,
  name: string,
  read: (connection: Pick<Database, "select" | "execute">) => Promise<T>,
  fallback: T,
  deadlineMs: number,
  statementMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expired = false;
  const deadline = new Promise<T>(resolve => {
    timer = setTimeout(() => {
      expired = true;
      console.warn("[homepage] section deadline exceeded", name);
      resolve(fallback);
    }, deadlineMs);
  });
  const query = db.transaction(async tx => {
    if (expired) return fallback;
    await tx.execute(sql`SELECT set_config('statement_timeout', ${String(statementMs)}, true)`);
    return expired ? fallback : read(tx);
  }, { accessMode: "read only" }).catch(() => {
    if (!expired) console.warn("[homepage] section query failed", name);
    return fallback;
  });
  try {
    return await Promise.race([query, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export async function loadHomepage(db: Database, deadlineMs = 5000, statementMs = 1200) {
  const section = <T>(name: string, read: (connection: Pick<Database, "select" | "execute">) => Promise<T>, fallback: T) =>
    loadSection(db, name, read, fallback, deadlineMs, statementMs);
  const [projects, portfolios, partners, homeStories, updates] = await Promise.all([
    section("projects", listPublicProjects, []),
    section("portfolios", countPublishedTalent, 0),
    section("partners", publicCompanies, []),
    section("stories", async connection => {
      const stories = await publicArticles(connection, "student_success", 6);
      const enriched = [];
      for (const story of stories) {
        const student = story.studentProfileId ? await articleStudent(connection, story.studentProfileId) : null;
        enriched.push({ ...story, student });
      }
      return enriched;
    }, []),
    section("updates", connection => publicArticles(connection, "updates", 4), []),
  ]);
  return { projects, portfolios, partners, homeStories, updates };
}
