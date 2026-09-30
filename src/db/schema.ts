import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const studentStatusEnum = pgEnum("student_status", ["current", "alumni"]);
export const profileStatusEnum = pgEnum("profile_status", [
  "published",
  "unpublished",
]);
export const availabilityValueEnum = pgEnum("availability_value", [
  "internship",
  "full-time",
  "contract",
]);
export const inquirySourceTypeEnum = pgEnum("inquiry_source_type", [
  "student",
  "project",
]);

export const students = pgTable(
  "students",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    headline: text("headline").notNull(),
    program: text("program").notNull(),
    status: studentStatusEnum("status").notNull(),
    profileStatus: profileStatusEnum("profile_status").notNull(),
  },
  (table) => [
    index("students_profile_status_idx").on(table.profileStatus),
    index("students_status_idx").on(table.status),
  ],
);

export const skills = pgTable(
  "skills",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    uniqueIndex("skills_name_unique").on(table.name),
    uniqueIndex("skills_normalized_name_unique").on(table.normalizedName),
    uniqueIndex("skills_display_order_unique").on(table.displayOrder),
  ],
);

export const studentSkills = pgTable(
  "student_skills",
  {
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "restrict" }),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.studentId, table.skillId] }),
    uniqueIndex("student_skills_order_unique").on(
      table.studentId,
      table.displayOrder,
    ),
    index("student_skills_skill_idx").on(table.skillId),
  ],
);

export const availabilityOptions = pgTable("availability_options", {
  value: availabilityValueEnum("value").primaryKey(),
  displayOrder: integer("display_order").notNull().unique(),
});

export const studentAvailability = pgTable(
  "student_availability",
  {
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    availabilityValue: availabilityValueEnum("availability_value")
      .notNull()
      .references(() => availabilityOptions.value, { onDelete: "restrict" }),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.studentId, table.availabilityValue] }),
    uniqueIndex("student_availability_order_unique").on(
      table.studentId,
      table.displayOrder,
    ),
    index("student_availability_value_idx").on(table.availabilityValue),
  ],
);

export const professionalLinks = pgTable(
  "professional_links",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    linkType: text("link_type").notNull(),
    label: text("label").notNull(),
    url: text("url").notNull(),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    uniqueIndex("professional_links_type_unique").on(
      table.studentId,
      table.linkType,
    ),
    uniqueIndex("professional_links_order_unique").on(
      table.studentId,
      table.displayOrder,
    ),
  ],
);

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  domain: text("domain").notNull(),
});

export const projectContributors = pgTable(
  "project_contributors",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.studentId] }),
    uniqueIndex("project_contributors_order_unique").on(
      table.projectId,
      table.displayOrder,
    ),
    index("project_contributors_student_idx").on(table.studentId),
  ],
);

export const projectTechnologies = pgTable(
  "project_technologies",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    technologyName: text("technology_name").notNull(),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.technologyName] }),
    uniqueIndex("project_technologies_order_unique").on(
      table.projectId,
      table.displayOrder,
    ),
  ],
);

export const projectAssets = pgTable(
  "project_assets",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    assetType: text("asset_type").notNull(),
    label: text("label").notNull(),
    url: text("url").notNull(),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    uniqueIndex("project_assets_type_unique").on(
      table.projectId,
      table.assetType,
    ),
    uniqueIndex("project_assets_order_unique").on(
      table.projectId,
      table.displayOrder,
    ),
  ],
);

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceType: inquirySourceTypeEnum("source_type").notNull(),
    studentId: text("student_id").references(() => students.id, {
      onDelete: "restrict",
    }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "restrict",
    }),
    sourceId: text("source_id").notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    companyName: text("company_name").notNull(),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "inquiries_source_fk_matches_type",
      sql`(
        (${table.sourceType} = 'student' AND ${table.studentId} IS NOT NULL AND ${table.projectId} IS NULL AND ${table.sourceId} = ${table.studentId})
        OR
        (${table.sourceType} = 'project' AND ${table.projectId} IS NOT NULL AND ${table.studentId} IS NULL AND ${table.sourceId} = ${table.projectId})
      )`,
    ),
    index("inquiries_created_at_idx").on(table.createdAt),
  ],
);

export type Student = typeof students.$inferSelect;
export type Project = typeof projects.$inferSelect;
