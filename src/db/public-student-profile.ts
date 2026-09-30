import { cache } from "react";

import { queryPublicStudentProfile } from "@/db/queries/student-profile";
import { getRuntimeDatabase } from "@/db/runtime";

export const getPublicStudentProfile = cache((studentId: string) =>
  queryPublicStudentProfile(getRuntimeDatabase(), studentId),
);
