import { createHash, createHmac, randomBytes } from "node:crypto";

export function createVerificationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashVerificationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createRateLimitKey(
  secret: string,
  action: string,
  subject: string,
) {
  return createHmac("sha256", secret)
    .update(`${action}\u0000${subject}`, "utf8")
    .digest("hex");
}
