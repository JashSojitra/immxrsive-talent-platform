import { z } from "zod";

export const AVAILABILITY_VALUES = [
  "internship",
  "full-time",
  "contract",
] as const;

const nonEmptyString = z.string().min(1);
const urlString = z.string().url();

export const studentFixtureSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    headline: nonEmptyString,
    program: nonEmptyString,
    status: z.enum(["current", "alumni"]),
    profile_status: z.enum(["published", "unpublished"]),
    availability: z.array(z.enum(AVAILABILITY_VALUES)).min(1),
    skills: z.array(nonEmptyString),
    links: z.record(nonEmptyString, urlString),
    project_ids: z.array(nonEmptyString),
  })
  .strict();

export const projectFixtureSchema = z
  .object({
    id: nonEmptyString,
    title: nonEmptyString,
    description: nonEmptyString,
    domain: nonEmptyString,
    technologies: z.array(nonEmptyString),
    contributors: z.array(
      z
        .object({
          student_id: nonEmptyString,
          role: nonEmptyString,
        })
        .strict(),
    ),
    links: z.record(nonEmptyString, urlString),
  })
  .strict();

export const fixtureSourceSchema = z
  .object({
    students: z.array(studentFixtureSchema),
    projects: z.array(projectFixtureSchema),
    skills: z.array(nonEmptyString),
  })
  .strict()
  .superRefine((data, context) => {
    checkUnique(
      data.students.map((student) => student.id),
      "student ID",
      ["students"],
      context,
    );
    checkUnique(
      data.projects.map((project) => project.id),
      "project ID",
      ["projects"],
      context,
    );
    checkUnique(data.skills, "standardized skill name", ["skills"], context);
    checkUnique(
      data.skills.map(normalizeSkillName),
      "case-insensitive standardized skill name",
      ["skills"],
      context,
    );

    const skillNames = new Set(data.skills);
    const studentIds = new Set(data.students.map((student) => student.id));
    const projectIds = new Set(data.projects.map((project) => project.id));

    data.students.forEach((student, studentIndex) => {
      checkUnique(
        student.skills,
        `skill for student ${student.id}`,
        ["students", studentIndex, "skills"],
        context,
      );
      checkUnique(
        student.availability,
        `availability value for student ${student.id}`,
        ["students", studentIndex, "availability"],
        context,
      );
      checkUnique(
        student.project_ids,
        `project reference for student ${student.id}`,
        ["students", studentIndex, "project_ids"],
        context,
      );

      student.skills.forEach((skill, skillIndex) => {
        if (!skillNames.has(skill)) {
          addIssue(
            context,
            ["students", studentIndex, "skills", skillIndex],
            `Student ${student.id} references unknown standardized skill "${skill}".`,
          );
        }
      });

      student.project_ids.forEach((projectId, projectIndex) => {
        if (!projectIds.has(projectId)) {
          addIssue(
            context,
            ["students", studentIndex, "project_ids", projectIndex],
            `Student ${student.id} references unknown project "${projectId}".`,
          );
        }
      });
    });

    data.projects.forEach((project, projectIndex) => {
      checkUnique(
        project.contributors.map((contributor) => contributor.student_id),
        `contributor for project ${project.id}`,
        ["projects", projectIndex, "contributors"],
        context,
      );
      checkUnique(
        project.technologies,
        `technology for project ${project.id}`,
        ["projects", projectIndex, "technologies"],
        context,
      );

      project.contributors.forEach((contributor, contributorIndex) => {
        if (!studentIds.has(contributor.student_id)) {
          addIssue(
            context,
            ["projects", projectIndex, "contributors", contributorIndex, "student_id"],
            `Project ${project.id} references unknown student "${contributor.student_id}".`,
          );
        }
      });
    });

    const contributorProjectsByStudent = new Map<string, Set<string>>();
    for (const project of data.projects) {
      for (const contributor of project.contributors) {
        const projects = contributorProjectsByStudent.get(contributor.student_id) ?? new Set();
        projects.add(project.id);
        contributorProjectsByStudent.set(contributor.student_id, projects);
      }
    }

    data.students.forEach((student, studentIndex) => {
      const studentProjectIds = new Set(student.project_ids);
      const contributorProjectIds = contributorProjectsByStudent.get(student.id) ?? new Set();

      for (const projectId of studentProjectIds) {
        if (!contributorProjectIds.has(projectId) && projectIds.has(projectId)) {
          addIssue(
            context,
            ["students", studentIndex, "project_ids"],
            `Relationship mismatch: student ${student.id} lists ${projectId}, but that project does not list the student as a contributor.`,
          );
        }
      }

      for (const projectId of contributorProjectIds) {
        if (!studentProjectIds.has(projectId)) {
          addIssue(
            context,
            ["students", studentIndex, "project_ids"],
            `Relationship mismatch: project ${projectId} lists student ${student.id} as a contributor, but the student does not list the project.`,
          );
        }
      }
    });
  });

function addIssue(
  context: z.RefinementCtx,
  path: PropertyKey[],
  message: string,
) {
  context.addIssue({ code: "custom", path, message });
}

function checkUnique(
  values: readonly string[],
  label: string,
  path: PropertyKey[],
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();

  values.forEach((value, index) => {
    if (seen.has(value)) {
      addIssue(context, [...path, index], `Duplicate ${label}: "${value}".`);
    }
    seen.add(value);
  });
}

export function normalizeSkillName(name: string) {
  return name.toLocaleLowerCase("en-CA");
}

export type StudentFixture = z.infer<typeof studentFixtureSchema>;
export type ProjectFixture = z.infer<typeof projectFixtureSchema>;
export type FixtureData = z.infer<typeof fixtureSourceSchema>;

export function validateFixtureData(source: unknown): FixtureData {
  return fixtureSourceSchema.parse(source);
}
