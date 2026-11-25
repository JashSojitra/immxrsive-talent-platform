// Review fixtures stay in their directories; editorial features do not amplify them.
export function isReviewRecord(title: string) {
  return /\b(?:R4|synthetic|review|website optional)\b/i.test(title) && /[0-9a-f]{8}-[0-9a-f]{4}-/i.test(title);
}
