import { cache } from "react";

import { queryPublicProject } from "@/db/queries/project-detail";
import { getRuntimeDatabase } from "@/db/runtime";

export const getPublicProject = cache((projectId: string) =>
  queryPublicProject(getRuntimeDatabase(), projectId),
);
