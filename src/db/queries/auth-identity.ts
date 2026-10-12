import { and, eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { authAccounts, authUsers } from "@/db/schema";

export async function findInternalUserByProviderAccount(
  db: Database,
  providerId: string,
  providerAccountId: string,
) {
  const [identity] = await db
    .select({
      id: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
      image: authUsers.image,
    })
    .from(authAccounts)
    .innerJoin(authUsers, eq(authAccounts.userId, authUsers.id))
    .where(
      and(
        eq(authAccounts.providerId, providerId),
        eq(authAccounts.accountId, providerAccountId),
      ),
    )
    .limit(1);

  return identity ?? null;
}
