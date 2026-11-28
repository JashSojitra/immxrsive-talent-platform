import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  check,
  index,
  integer,
  jsonb,
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
export const studentAffiliationStatusEnum = pgEnum(
  "student_affiliation_status",
  ["verified"],
);
export const studentProfileLinkTypeEnum = pgEnum("student_profile_link_type", [
  "linkedin",
  "github",
  "portfolio",
  "other",
]);

export type PortfolioSection = "about" | "skills" | "background" | "links";

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
  origin: text("origin", { enum: ["legacy_fixture", "student", "admin"] }).default("legacy_fixture").notNull(),
  managementMode: text("management_mode", { enum: ["STUDENT_MANAGED", "ADMIN_MANAGED"] }).default("STUDENT_MANAGED").notNull(),
  maintainerUserId: text("maintainer_user_id").references(() => authUsers.id, { onDelete: "restrict" }),
  publicationStatus: profileStatusEnum("publication_status").default("unpublished").notNull(),
  projectStatus: text("project_status", { enum: ["in_progress", "completed", "on_hold"] }).default("in_progress").notNull(),
  projectDate: date("project_date"),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (table) => [
  check("projects_origin_owner_check", sql`(${table.origin} = 'legacy_fixture' AND ${table.maintainerUserId} IS NULL) OR (${table.origin} = 'student' AND ${table.maintainerUserId} IS NOT NULL) OR (${table.origin} = 'admin' AND ${table.maintainerUserId} IS NULL)`),
  check("projects_management_mode_check", sql`(${table.managementMode} = 'ADMIN_MANAGED' AND ${table.origin} = 'admin') OR (${table.managementMode} = 'STUDENT_MANAGED' AND ${table.origin} IN ('legacy_fixture','student'))`),
  check("projects_status_check", sql`${table.projectStatus} IN ('in_progress', 'completed', 'on_hold')`),
  check("projects_version_positive", sql`${table.version} > 0`),
  index("projects_maintainer_idx").on(table.maintainerUserId),
  index("projects_publication_idx").on(table.publicationStatus),
]);

export const projectRoles = pgTable("project_roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").notNull().unique(),
}).enableRLS();

export const projectRepositories = pgTable("project_repositories", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  url: text("url").notNull(),
  normalizedKey: text("normalized_key").notNull(),
  displayOrder: integer("display_order").notNull(),
}, (table) => [
  uniqueIndex("project_repositories_project_key_unique").on(table.projectId, table.normalizedKey),
  index("project_repositories_key_idx").on(table.normalizedKey),
]).enableRLS();

export const projectLinks = pgTable("project_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  label: text("label").notNull(),
  url: text("url").notNull(),
  displayOrder: integer("display_order").notNull(),
}, (table) => [index("project_links_project_idx").on(table.projectId)]).enableRLS();

export const projectMemberships = pgTable("project_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  profileId: uuid("profile_id").notNull().references(() => studentProfiles.id, { onDelete: "restrict" }),
  state: text("state", { enum: ["pending", "accepted", "declined", "removed"] }).default("pending").notNull(),
  proposedRoleId: text("proposed_role_id").notNull().references(() => projectRoles.id, { onDelete: "restrict" }),
  invitedByUserId: text("invited_by_user_id").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  removedByUserId: text("removed_by_user_id").references(() => authUsers.id, { onDelete: "restrict" }),
  removalReason: text("removal_reason").default("").notNull(),
  restoredAt: timestamp("restored_at", { withTimezone: true }),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("project_memberships_project_profile_unique").on(table.projectId, table.profileId),
  index("project_memberships_profile_idx").on(table.profileId),
  check("project_memberships_state_check", sql`${table.state} IN ('pending', 'accepted', 'declined', 'removed')`),
  check("project_memberships_acceptance_check", sql`(${table.state} IN ('accepted', 'removed') AND ${table.acceptedAt} IS NOT NULL) OR (${table.state} IN ('pending', 'declined') AND ${table.acceptedAt} IS NULL)`),
  check("project_memberships_removal_check", sql`${table.state} <> 'removed' OR (${table.removedAt} IS NOT NULL AND ${table.removedByUserId} IS NOT NULL)`),
  check("project_memberships_version_positive", sql`${table.version} > 0`),
]).enableRLS();

export const projectContributions = pgTable("project_contributions", {
  membershipId: uuid("membership_id").primaryKey().references(() => projectMemberships.id, { onDelete: "restrict" }),
  roleId: text("role_id").notNull().references(() => projectRoles.id, { onDelete: "restrict" }),
  statement: text("statement").default("").notNull(),
  featured: boolean("featured").default(true).notNull(),
  publicVisible: boolean("public_visible").default(true).notNull(),
  version: integer("version").default(1).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [check("project_contributions_version_positive", sql`${table.version} > 0`)]).enableRLS();

export const projectMaintainerTransfers = pgTable("project_maintainer_transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  fromUserId: text("from_user_id").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  toMembershipId: uuid("to_membership_id").notNull().references(() => projectMemberships.id, { onDelete: "restrict" }),
  projectVersion: integer("project_version").notNull(),
  state: text("state", { enum: ["pending", "accepted", "declined", "cancelled"] }).default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("project_transfer_pending_unique").on(table.projectId).where(sql`${table.state} = 'pending'`),
  check("project_transfer_state_check", sql`${table.state} IN ('pending', 'accepted', 'declined', 'cancelled')`),
  check("project_transfer_version_positive", sql`${table.projectVersion} > 0`),
]).enableRLS();

export const PROJECT_MEDIA_KINDS = ["playable", "video", "source", "fallback_image", "fallback_video", "fallback_link"] as const;
export const projectMedia = pgTable("project_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  kind: text("kind", { enum: PROJECT_MEDIA_KINDS }).notNull(),
  url: text("url").notNull(),
  label: text("label").notNull(),
  altText: text("alt_text").default("").notNull(),
  displayOrder: integer("display_order").notNull(),
}, (table) => [
  index("project_media_project_idx").on(table.projectId),
  uniqueIndex("project_media_primary_unique").on(table.projectId, table.kind).where(sql`${table.kind} IN ('playable', 'video')`),
  check("project_media_kind_check", sql`${table.kind} IN ('playable', 'video', 'source', 'fallback_image', 'fallback_video', 'fallback_link')`),
]).enableRLS();

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
    studentProfileId: uuid("student_profile_id").references(() => studentProfiles.id, {
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
        (${table.sourceType} = 'student' AND ${table.projectId} IS NULL AND (
          (${table.studentId} IS NOT NULL AND ${table.studentProfileId} IS NULL AND ${table.sourceId} = ${table.studentId})
          OR
          (${table.studentId} IS NULL AND ${table.studentProfileId} IS NOT NULL AND ${table.sourceId} = ${table.studentProfileId}::text)
        ))
        OR
        (${table.sourceType} = 'project' AND ${table.projectId} IS NOT NULL AND ${table.studentId} IS NULL AND ${table.studentProfileId} IS NULL AND ${table.sourceId} = ${table.projectId})
      )`,
    ),
    index("inquiries_created_at_idx").on(table.createdAt),
  ],
);

export const authUsers = pgTable("auth_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => [index("auth_sessions_user_id_idx").on(table.userId)],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("auth_accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    index("auth_accounts_user_id_idx").on(table.userId),
  ],
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("auth_verifications_identifier_idx").on(table.identifier),
  ],
);

export const studentAffiliations = pgTable(
  "student_affiliations",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    institutionalEmail: text("institutional_email").notNull(),
    status: studentAffiliationStatusEnum("status")
      .default("verified")
      .notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("student_affiliations_email_unique").on(
      table.institutionalEmail,
    ),
  ],
);

export const affiliationVerificationChallenges = pgTable(
  "affiliation_verification_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    institutionalEmail: text("institutional_email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("affiliation_challenges_user_idx").on(table.userId),
    index("affiliation_challenges_email_idx").on(table.institutionalEmail),
    index("affiliation_challenges_expires_idx").on(table.expiresAt),
  ],
);

export const affiliationVerificationRateLimits = pgTable(
  "affiliation_verification_rate_limits",
  {
    keyHash: text("key_hash").primaryKey(),
    action: text("action").notNull(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
    }).notNull(),
    attemptCount: integer("attempt_count").default(1).notNull(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("affiliation_rate_limits_action_idx").on(table.action)],
);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });
export const mediaKindEnum = pgEnum("media_kind", ["avatar", "article_cover", "article_inline"]);
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  kind: mediaKindEnum("kind").notNull(),
  mime: text("mime").notNull(), width: integer("width").notNull(), height: integer("height").notNull(),
  byteSize: integer("byte_size").notNull(), sha256: text("sha256").notNull(), bytes: bytea("bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [index("media_assets_owner_idx").on(t.ownerUserId)]).enableRLS();

export const studentProfiles = pgTable(
  "student_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    avatarMediaId: uuid("avatar_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    ownerUserId: text("owner_user_id")
      .notNull()
      .unique()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    publicationStatus: profileStatusEnum("publication_status")
      .default("unpublished")
      .notNull(),
    headline: text("headline").default("").notNull(),
    biography: text("biography").default("").notNull(),
    publicLocation: text("public_location").default("").notNull(),
    program: text("program").default("").notNull(),
    studentStatus: studentStatusEnum("student_status"),
    showAvailability: boolean("show_availability").default(false).notNull(),
    showProfessionalLinks: boolean("show_professional_links").default(false).notNull(),
    showPublicLocation: boolean("show_public_location").default(false).notNull(),
    showEducation: boolean("show_education").default(false).notNull(),
    showExperience: boolean("show_experience").default(false).notNull(),
    presentationPreset: text("presentation_preset").default("spatial").notNull(),
    heroMedia: text("hero_media").default("default").notNull(),
    sectionOrder: jsonb("section_order").$type<PortfolioSection[]>()
      .default(["about", "skills", "background", "links"]).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("student_profiles_owner_idx").on(table.ownerUserId),
    index("student_profiles_publication_idx").on(table.publicationStatus),
  ],
);

export const articleCategoryEnum = pgEnum("article_category", ["student_success", "event", "news"]);
export const articleStatusEnum = pgEnum("article_status", ["draft", "in_review", "published", "archived"]);
export const articles = pgTable("articles", {
  id: uuid("id").defaultRandom().primaryKey(), slug: text("slug").notNull().unique(),
  category: articleCategoryEnum("category").notNull(), status: articleStatusEnum("status").default("draft").notNull(),
  title: text("title").notNull(), excerpt: text("excerpt").default("").notNull(), bodyMarkdown: text("body_markdown").default("").notNull(),
  coverMediaId: uuid("cover_media_id").references(() => mediaAssets.id, { onDelete: "restrict" }), coverAlt: text("cover_alt").default("").notNull(),
  studentProfileId: uuid("student_profile_id").references(() => studentProfiles.id, { onDelete: "restrict" }),
  eventName: text("event_name").default("").notNull(), eventDate: date("event_date"), eventLocation: text("event_location").default("").notNull(),
  tags: text("tags").array().default([]).notNull(), authorDisplayName: text("author_display_name").notNull(),
  studentApprovedAt: timestamp("student_approved_at", { withTimezone: true }), approvalRequestedAt: timestamp("approval_requested_at", { withTimezone: true }),
  studentNote: text("student_note").default("").notNull(), publishedAt: timestamp("published_at", { withTimezone: true }),
  createdBy: text("created_by").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  updatedBy: text("updated_by").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [
  check("articles_success_profile_check", sql`${t.category} <> 'student_success' OR ${t.studentProfileId} IS NOT NULL`),
  check("articles_excerpt_check", sql`length(${t.excerpt}) <= 200`),
  check("articles_cover_alt_check", sql`${t.coverMediaId} IS NULL OR length(trim(${t.coverAlt})) > 0`),
  check("articles_success_approval_check", sql`${t.status} <> 'published' OR ${t.category} <> 'student_success' OR ${t.studentApprovedAt} IS NOT NULL`),
  index("articles_public_idx").on(t.status, t.category, t.publishedAt),
]).enableRLS();

export const studentProfileSkills = pgTable(
  "student_profile_skills",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "restrict" }),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.skillId] }),
    uniqueIndex("student_profile_skills_order_unique").on(
      table.profileId,
      table.displayOrder,
    ),
  ],
);

export const studentProfileAvailability = pgTable(
  "student_profile_availability",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    availabilityValue: availabilityValueEnum("availability_value")
      .notNull()
      .references(() => availabilityOptions.value, { onDelete: "restrict" }),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.availabilityValue] }),
    uniqueIndex("student_profile_availability_order_unique").on(
      table.profileId,
      table.displayOrder,
    ),
  ],
);

export const studentProfileLinks = pgTable(
  "student_profile_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    linkType: studentProfileLinkTypeEnum("link_type").notNull(),
    label: text("label").notNull(),
    url: text("url").notNull(),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    uniqueIndex("student_profile_links_order_unique").on(
      table.profileId,
      table.displayOrder,
    ),
    index("student_profile_links_profile_idx").on(table.profileId),
  ],
);

export const studentProfileEducation = pgTable(
  "student_profile_education",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    uniqueIndex("student_profile_education_order_unique").on(
      table.profileId,
      table.displayOrder,
    ),
    index("student_profile_education_profile_idx").on(table.profileId),
  ],
);

export const studentProfileExperience = pgTable(
  "student_profile_experience",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    uniqueIndex("student_profile_experience_order_unique").on(
      table.profileId,
      table.displayOrder,
    ),
    index("student_profile_experience_profile_idx").on(table.profileId),
  ],
);

export type Student = typeof students.$inferSelect;
export const projectJoinRequests = pgTable("project_join_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  profileId: uuid("profile_id").notNull().references(() => studentProfiles.id, { onDelete: "restrict" }),
  state: text("state", { enum: ["pending", "approved", "declined"] }).default("pending").notNull(),
  membershipId: uuid("membership_id").references(() => projectMemberships.id, { onDelete: "restrict" }),
  respondedByUserId: text("responded_by_user_id").references(() => authUsers.id, { onDelete: "restrict" }),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
}, table => [
  uniqueIndex("project_join_requests_project_profile_unique").on(table.projectId, table.profileId),
  index("project_join_requests_profile_idx").on(table.profileId),
  check("project_join_requests_state_check", sql`${table.state} IN ('pending','approved','declined')`),
  check("project_join_requests_version_positive", sql`${table.version} > 0`),
  check("project_join_requests_response_check", sql`(${table.state} = 'pending' AND ${table.respondedAt} IS NULL AND ${table.respondedByUserId} IS NULL AND ${table.membershipId} IS NULL) OR (${table.state} IN ('approved','declined') AND ${table.respondedAt} IS NOT NULL AND ${table.respondedByUserId} IS NOT NULL AND ((${table.state} = 'approved' AND ${table.membershipId} IS NOT NULL) OR (${table.state} = 'declined' AND ${table.membershipId} IS NULL)))`),
]).enableRLS();
export type Project = typeof projects.$inferSelect;
export type AuthUser = typeof authUsers.$inferSelect;
export type StudentAffiliation = typeof studentAffiliations.$inferSelect;
export type StudentProfile = typeof studentProfiles.$inferSelect;

// Staff grants are independent of Better Auth profile fields and student affiliation.
export const studioRoles = pgTable("studio_roles", {
  userId: text("user_id").primaryKey().references(() => authUsers.id, { onDelete: "restrict" }),
  role: text("role").notNull(),
}, t => [check("studio_role_check", sql`${t.role} IN ('xr_curator','xr_admin','platform_super_admin')`)]).enableRLS();
export const studioSubmissions = pgTable("studio_submissions", {
  projectId: text("project_id").primaryKey().references(() => projects.id, { onDelete: "restrict" }),
  submittedBy: text("submitted_by").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  state: text("state").notNull().default("submitted"),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  mediaUrl: text("media_url").notNull().default(""),
  demoUrl: text("demo_url").notNull().default(""),
  contentVersion: integer("content_version").notNull().default(1),
  acceptedVersion: integer("accepted_version"),
  acceptedBy: text("accepted_by").references(() => authUsers.id, { onDelete: "restrict" }),
  acceptedProjectVersion: integer("accepted_project_version"),
  published: boolean("published").notNull().default(false),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  check("studio_state_check", sql`${t.state} IN ('submitted','under_review','changes_requested','approved','rejected','withdrawn')`),
  check("studio_versions_check", sql`${t.version} > 0 AND ${t.contentVersion} > 0 AND (${t.acceptedVersion} IS NULL OR ${t.acceptedVersion} = ${t.contentVersion})`),
  check("studio_acceptance_check", sql`(${t.acceptedVersion} IS NULL AND ${t.acceptedBy} IS NULL AND ${t.acceptedProjectVersion} IS NULL) OR (${t.acceptedVersion} IS NOT NULL AND ${t.acceptedBy} IS NOT NULL AND ${t.acceptedProjectVersion} IS NOT NULL AND ${t.acceptedProjectVersion} > 0)`),
  check("studio_publish_check", sql`NOT ${t.published} OR (${t.state} = 'approved' AND ${t.acceptedVersion} = ${t.contentVersion} AND ${t.acceptedBy} IS NOT NULL)`),
  check("studio_content_check", sql`length(${t.title}) BETWEEN 1 AND 160 AND length(${t.summary}) BETWEEN 1 AND 4000 AND length(${t.mediaUrl}) <= 2048 AND length(${t.demoUrl}) <= 2048`),
  index("studio_queue_idx").on(t.state, t.updatedAt),
]).enableRLS();
export const studioEvents = pgTable("studio_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: text("project_id").references(() => studioSubmissions.projectId, { onDelete: "restrict" }),
  actorUserId: text("actor_user_id").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  action: text("action").notNull(),
  note: text("note").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("studio_history_idx").on(t.projectId, t.createdAt), check("studio_event_note_check", sql`length(${t.note}) <= 2000`)]).enableRLS();

// Admin ownership and descriptive presentation are independent of student membership.
export const adminProjectDetails = pgTable("admin_project_details", {
  projectId: text("project_id").primaryKey().references(() => projects.id, { onDelete: "restrict" }),
  createdBy: text("created_by").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  lifecycle: text("lifecycle", { enum: ["draft", "published", "unpublished", "archived"] }).default("draft").notNull(),
  content: jsonb("content").$type<import("@/admin/policy").AdminContent>().notNull(),
  repositoryKey: text("repository_key"),
}, t => [
  check("admin_lifecycle_check", sql`${t.lifecycle} IN ('draft','published','unpublished','archived')`),
  uniqueIndex("admin_repository_unique").on(t.repositoryKey),
]).enableRLS();
export const adminCreditLinks = pgTable("admin_credit_links", {
  projectId: text("project_id").notNull().references(() => adminProjectDetails.projectId, { onDelete: "restrict" }),
  profileId: uuid("profile_id").notNull().references(() => studentProfiles.id, { onDelete: "restrict" }),
}, t => [primaryKey({ columns: [t.projectId, t.profileId] })]).enableRLS();
export const adminEvents = pgTable("admin_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: text("project_id").references(() => adminProjectDetails.projectId, { onDelete: "restrict" }),
  actorUserId: text("actor_user_id").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  action: text("action").notNull(), note: text("note").notNull(), snapshot: jsonb("snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [index("admin_event_history_idx").on(t.projectId, t.createdAt), check("admin_event_note_check", sql`length(${t.note}) <= 2000`)]).enableRLS();

// R4 companies and independently reviewed relationships. Imported text is only content.
export const partnerCompanies = pgTable("partner_companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: jsonb("content").$type<import("@/partners/policy").CompanyContent>().notNull(),
  normalizedDomain: text("normalized_domain"),
  sources: jsonb("sources").$type<{sourceUrl:string;timestamp:string}[]>().default([]).notNull(),
  status: text("status", { enum: ["draft", "published"] }).default("draft").notNull(),
  version: integer("version").default(1).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [index("partner_companies_domain_idx").on(t.normalizedDomain), check("partner_companies_status_check",sql`${t.status} IN ('draft','published')`), check("partner_companies_version_check",sql`${t.version} > 0`)]).enableRLS();
export const partnerCollaborations = pgTable("partner_collaborations", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => partnerCompanies.id, { onDelete: "restrict" }),
  content: jsonb("content").$type<import("@/partners/policy").CollaborationContent>().notNull(),
  version: integer("version").default(1).notNull(),
}, t => [check("partner_collaborations_content_check",sql`${t.content}->>'visibility' IN ('public','limited','private') AND ${t.content}->>'status' IN ('current','past')`),check("partner_collaborations_version_check",sql`${t.version} > 0`)]).enableRLS();
export const partnerCollaborationProjects = pgTable("partner_collaboration_projects", {
  collaborationId: uuid("collaboration_id").notNull().references(() => partnerCollaborations.id, { onDelete: "restrict" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
}, t => [primaryKey({ columns: [t.collaborationId, t.projectId] })]).enableRLS();
export const partnerCollaborationParticipants = pgTable("partner_collaboration_participants", {
  collaborationId: uuid("collaboration_id").notNull().references(() => partnerCollaborations.id, { onDelete: "restrict" }),
  profileId: uuid("profile_id").notNull().references(() => studentProfiles.id, { onDelete: "restrict" }),
}, t => [primaryKey({ columns: [t.collaborationId, t.profileId] })]).enableRLS();
export const partnerRequests = pgTable("partner_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind", { enum: ["verification", "association"] }).notNull(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  actorUserId: text("actor_user_id").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  companyId: uuid("company_id").references(() => partnerCompanies.id, { onDelete: "restrict" }),
  suggestedCompany: text("suggested_company").notNull(),
  note: text("note").notNull(), evidence: text("evidence").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  decisionNote: text("decision_note").default("").notNull(),
  reviewedBy: text("reviewed_by").references(() => authUsers.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [check("partner_requests_kind_check",sql`${t.kind} IN ('verification','association')`),check("partner_requests_status_check",sql`${t.status} IN ('pending','approved','rejected')`),check("partner_requests_no_self_review",sql`${t.reviewedBy} IS NULL OR ${t.reviewedBy} <> ${t.actorUserId}`),uniqueIndex("partner_requests_one_pending").on(t.projectId, t.kind).where(sql`${t.status} = 'pending'`)]).enableRLS();
export const projectOfficialVerifications = pgTable("project_official_verifications", {
  projectId: text("project_id").primaryKey().references(() => projects.id, { onDelete: "restrict" }),
  requestId: uuid("request_id").notNull().references(() => partnerRequests.id, { onDelete: "restrict" }),
}).enableRLS();
export const projectVerifiedPartners = pgTable("project_verified_partners", {
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  companyId: uuid("company_id").notNull().references(() => partnerCompanies.id, { onDelete: "restrict" }),
  requestId: uuid("request_id").notNull().references(() => partnerRequests.id, { onDelete: "restrict" }),
}, t => [primaryKey({ columns: [t.projectId, t.companyId] })]).enableRLS();
export const partnerEvents = pgTable("partner_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: text("actor_user_id").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  action: text("action").notNull(), subjectId: text("subject_id").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();
export const partnerInquiries = pgTable("partner_inquiries", {
 id: uuid("id").defaultRandom().primaryKey(),
 companyId: uuid("company_id").notNull().references(() => partnerCompanies.id, {onDelete:"restrict"}),
 sourceName: text("source_name").notNull(),
 content: jsonb("content").$type<{companyName:string;contactName:string;contactEmail:string;description:string}>().notNull(),
 createdAt: timestamp("created_at", {withTimezone:true}).defaultNow().notNull(),
}).enableRLS();
