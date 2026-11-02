import type { getProjectTeam } from "./service";
export type ProjectTeamData = Awaited<ReturnType<typeof getProjectTeam>>;
export type PersonalContribution = { roleId: string; statement: string; featured: boolean; publicVisible: boolean };
