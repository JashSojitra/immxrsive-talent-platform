import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, isNull, ne, sql } from "drizzle-orm";

import type { VerificationMailer } from "@/email/affiliation-verification";
import type { Database } from "@/db/client";
import {
  affiliationVerificationChallenges,
  affiliationVerificationRateLimits,
  studentAffiliations,
} from "@/db/schema";
import type { AffiliationVerificationConfig } from "@/verification/config";
import {
  createRateLimitKey,
  createVerificationToken,
  hashVerificationToken,
} from "@/verification/security";
import { normalizeInstitutionalEmail } from "@/verification/validation";

const REQUEST_LIMIT = 3;
const CONFIRM_LIMIT = 8;
const RATE_WINDOW_SECONDS = 15 * 60;
const RATE_BLOCK_SECONDS = 15 * 60;

export type StudentVerificationStatus =
  | { status: "unverified"; institutionalEmail: null; verifiedAt: null }
  | { status: "verified"; institutionalEmail: string; verifiedAt: Date };

export type VerificationFailureCode =
  | "INVALID_EMAIL"
  | "EMAIL_UNAVAILABLE"
  | "RATE_LIMITED"
  | "EMAIL_DELIVERY_FAILED"
  | "INVALID_TOKEN"
  | "EXPIRED_TOKEN"
  | "USED_TOKEN"
  | "ALREADY_VERIFIED";

export class AffiliationVerificationError extends Error {
  constructor(
    readonly code: VerificationFailureCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AffiliationVerificationError";
  }
}

export async function getStudentVerificationStatus(
  db: Database,
  userId: string,
): Promise<StudentVerificationStatus> {
  const [affiliation] = await db
    .select({
      institutionalEmail: studentAffiliations.institutionalEmail,
      verifiedAt: studentAffiliations.verifiedAt,
    })
    .from(studentAffiliations)
    .where(eq(studentAffiliations.userId, userId))
    .limit(1);

  return affiliation
    ? { status: "verified", ...affiliation }
    : { status: "unverified", institutionalEmail: null, verifiedAt: null };
}

export async function requestAffiliationVerification(input: {
  db: Database;
  userId: string;
  email: string;
  mailer: VerificationMailer;
  config: AffiliationVerificationConfig;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const email = normalizeInstitutionalEmail(
    input.email,
    input.config.approvedDomains,
  );
  if (!email) {
    throw new AffiliationVerificationError(
      "INVALID_EMAIL",
      422,
      "Enter an email address from an approved Algoma University domain.",
    );
  }

  const currentStatus = await getStudentVerificationStatus(input.db, input.userId);
  if (currentStatus.status === "verified") {
    throw new AffiliationVerificationError(
      "ALREADY_VERIFIED",
      409,
      "This student account is already verified.",
    );
  }

  const [existingOwner] = await input.db
    .select({ userId: studentAffiliations.userId })
    .from(studentAffiliations)
    .where(eq(studentAffiliations.institutionalEmail, email))
    .limit(1);
  if (existingOwner && existingOwner.userId !== input.userId) {
    throw emailUnavailable();
  }

  await enforceRateLimit(
    input.db,
    input.config,
    "verification-request-user",
    input.userId,
    REQUEST_LIMIT,
    now,
  );
  await enforceRateLimit(
    input.db,
    input.config,
    "verification-request-email",
    email,
    REQUEST_LIMIT,
    now,
  );

  const token = createVerificationToken();
  const tokenHash = hashVerificationToken(token);
  const challengeId = randomUUID();
  const expiresAt = new Date(now.getTime() + input.config.ttlMinutes * 60_000);

  await input.db.transaction(async (transaction) => {
    await transaction
      .update(affiliationVerificationChallenges)
      .set({ supersededAt: now })
      .where(and(
        eq(affiliationVerificationChallenges.userId, input.userId),
        isNull(affiliationVerificationChallenges.consumedAt),
        isNull(affiliationVerificationChallenges.supersededAt),
      ));
    await transaction.insert(affiliationVerificationChallenges).values({
      id: challengeId,
      userId: input.userId,
      institutionalEmail: email,
      tokenHash,
      expiresAt,
      createdAt: now,
    });
  });

  const verifyUrl = new URL("/student/verify", input.config.applicationBaseUrl);
  verifyUrl.searchParams.set("token", token);
  try {
    await input.mailer.sendVerificationEmail({
      to: email,
      verifyUrl: verifyUrl.toString(),
      expiresMinutes: input.config.ttlMinutes,
      idempotencyKey: challengeId,
    });
  } catch {
    await input.db
      .update(affiliationVerificationChallenges)
      .set({ supersededAt: new Date() })
      .where(eq(affiliationVerificationChallenges.id, challengeId));
    throw new AffiliationVerificationError(
      "EMAIL_DELIVERY_FAILED",
      503,
      "The verification email could not be sent right now. Please try again later.",
    );
  }

  return { status: "sent" as const, expiresAt };
}

export async function confirmAffiliationVerification(input: {
  db: Database;
  userId: string;
  token: string;
  clientAddress: string;
  config: AffiliationVerificationConfig;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  await enforceRateLimit(
    input.db,
    input.config,
    "verification-confirm-user",
    input.userId,
    CONFIRM_LIMIT,
    now,
  );
  await enforceRateLimit(
    input.db,
    input.config,
    "verification-confirm-address",
    input.clientAddress,
    CONFIRM_LIMIT,
    now,
  );

  const tokenHash = hashVerificationToken(input.token);
  try {
    return await input.db.transaction(async (transaction) => {
      const [challenge] = await transaction
        .select()
        .from(affiliationVerificationChallenges)
        .where(eq(affiliationVerificationChallenges.tokenHash, tokenHash))
        .limit(1)
        .for("update");

      if (!challenge || challenge.userId !== input.userId || challenge.supersededAt) {
        throw invalidToken();
      }
      if (challenge.consumedAt) {
        throw new AffiliationVerificationError(
          "USED_TOKEN",
          409,
          "This verification link has already been used.",
        );
      }
      if (challenge.expiresAt.getTime() <= now.getTime()) {
        throw new AffiliationVerificationError(
          "EXPIRED_TOKEN",
          410,
          "This verification link has expired. Request a new link.",
        );
      }

      const [existing] = await transaction
        .select()
        .from(studentAffiliations)
        .where(eq(studentAffiliations.userId, input.userId))
        .limit(1)
        .for("update");
      if (existing) {
        throw new AffiliationVerificationError(
          "ALREADY_VERIFIED",
          409,
          "This student account is already verified.",
        );
      }

      await transaction.insert(studentAffiliations).values({
        userId: input.userId,
        institutionalEmail: challenge.institutionalEmail,
        status: "verified",
        verifiedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      await transaction
        .update(affiliationVerificationChallenges)
        .set({ consumedAt: now })
        .where(and(
          eq(affiliationVerificationChallenges.id, challenge.id),
          isNull(affiliationVerificationChallenges.consumedAt),
        ));
      await transaction
        .update(affiliationVerificationChallenges)
        .set({ supersededAt: now })
        .where(and(
          eq(affiliationVerificationChallenges.userId, input.userId),
          ne(affiliationVerificationChallenges.id, challenge.id),
          isNull(affiliationVerificationChallenges.consumedAt),
          isNull(affiliationVerificationChallenges.supersededAt),
        ));

      return {
        status: "verified" as const,
        institutionalEmail: challenge.institutionalEmail,
        verifiedAt: now,
      };
    });
  } catch (error) {
    if (error instanceof AffiliationVerificationError) throw error;
    if (isUniqueViolation(error)) throw emailUnavailable();
    throw error;
  }
}

async function enforceRateLimit(
  db: Database,
  config: AffiliationVerificationConfig,
  action: string,
  subject: string,
  limit: number,
  now: Date,
) {
  const keyHash = createRateLimitKey(config.rateLimitSecret, action, subject);
  const nowIso = now.toISOString();
  const [result] = await db.execute<{
    attempt_count: number;
    blocked_until: string | null;
  }>(sql`
    insert into ${affiliationVerificationRateLimits}
      (key_hash, action, window_started_at, attempt_count, blocked_until, updated_at)
    values (${keyHash}, ${action}, ${nowIso}::timestamptz, 1, null, ${nowIso}::timestamptz)
    on conflict (key_hash) do update set
      action = excluded.action,
      attempt_count = case
        when ${affiliationVerificationRateLimits.windowStartedAt} <= ${nowIso}::timestamptz - (${RATE_WINDOW_SECONDS} * interval '1 second') then 1
        else ${affiliationVerificationRateLimits.attemptCount} + 1
      end,
      window_started_at = case
        when ${affiliationVerificationRateLimits.windowStartedAt} <= ${nowIso}::timestamptz - (${RATE_WINDOW_SECONDS} * interval '1 second') then ${nowIso}::timestamptz
        else ${affiliationVerificationRateLimits.windowStartedAt}
      end,
      blocked_until = case
        when ${affiliationVerificationRateLimits.blockedUntil} > ${nowIso}::timestamptz then ${affiliationVerificationRateLimits.blockedUntil}
        when ${affiliationVerificationRateLimits.windowStartedAt} <= ${nowIso}::timestamptz - (${RATE_WINDOW_SECONDS} * interval '1 second') then null
        when ${affiliationVerificationRateLimits.attemptCount} + 1 > ${limit} then ${nowIso}::timestamptz + (${RATE_BLOCK_SECONDS} * interval '1 second')
        else null
      end,
      updated_at = ${nowIso}::timestamptz
    returning attempt_count, blocked_until
  `);

  if (result?.blocked_until && new Date(result.blocked_until).getTime() > now.getTime()) {
    throw new AffiliationVerificationError(
      "RATE_LIMITED",
      429,
      "Too many verification attempts. Try again in 15 minutes.",
    );
  }
}

function invalidToken() {
  return new AffiliationVerificationError(
    "INVALID_TOKEN",
    404,
    "This verification link is invalid or no longer active.",
  );
}

function emailUnavailable() {
  return new AffiliationVerificationError(
    "EMAIL_UNAVAILABLE",
    409,
    "This university email cannot be verified for this account.",
  );
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && (error as { code?: unknown }).code === "23505") return true;
  return "cause" in error && isUniqueViolation((error as { cause?: unknown }).cause);
}
