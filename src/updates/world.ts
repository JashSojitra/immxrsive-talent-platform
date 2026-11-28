import "server-only";
import type { Database } from "@/db/client";
import { articleStudent, publicArticles } from "./service";
import { padStoryVolumes, newsstandPapers } from "./world-content";
export async function worldUpdates(db: Database) {
  const [stories, updates] = await Promise.all([publicArticles(db, "student_success", 7), publicArticles(db, "updates", 5)]);
  const volumes = await Promise.all(stories.map(async a => { const student = a.studentProfileId ? await articleStudent(db, a.studentProfileId) : null; return { name: student?.name ?? a.title, role: student?.headline ?? "Student story", photoUrl: student?.avatarMediaId ? `/media/${student.avatarMediaId}` : null, excerpt: a.excerpt, href: `/updates/${a.slug}` }; }));
  return { volumes: padStoryVolumes(volumes), papers: newsstandPapers(updates) };
}
