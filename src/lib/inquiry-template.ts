export type InquiryTemplateSource = {
  type: "student" | "project";
  id: string;
  name: string;
  detail: string;
};

export const INQUIRY_TEMPLATE_PLACEHOLDERS = [
  "[your name]",
  "[company/organization]",
  "[specific aspect of the project]",
  "[potential collaboration or question]",
  "[Add additional details or requirements here.]",
  "[opportunity or collaboration]",
  "[Explain the nature of the opportunity and any relevant details.]",
] as const;

export function createInquiryTemplate(source: InquiryTemplateSource) {
  if (source.type === "project") {
    return `Hello,

My name is [your name], and I am reaching out on behalf of
[company/organization].

I recently came across the project "${source.name}"
(${source.id}) on the ImmXrsive Talent Platform.

Project context: ${source.detail}

I am particularly interested in [specific aspect of the project].

We would like to explore [potential collaboration or question].

[Add additional details or requirements here.]

I would appreciate the opportunity to discuss this further.

Best regards,
[your name]
[company/organization]`;
  }

  return `Hello,

My name is [your name], and I am reaching out on behalf of
[company/organization].

I came across the profile of ${source.name} on the
ImmXrsive Talent Platform.

Their professional focus on ${source.detail}
caught my attention.

We are interested in discussing [opportunity or collaboration].

[Explain the nature of the opportunity and any relevant details.]

I would appreciate the opportunity to connect.

Best regards,
[your name]
[company/organization]`;
}

export function findUnresolvedInquiryPlaceholders(message: string) {
  const normalizedMessage = message.toLocaleLowerCase();
  return INQUIRY_TEMPLATE_PLACEHOLDERS.filter((placeholder) =>
    normalizedMessage.includes(placeholder.toLocaleLowerCase()),
  );
}

export function unresolvedPlaceholderMessage(placeholders: readonly string[]) {
  const promptList = placeholders.join(", ");
  return `Replace the remaining template prompt${placeholders.length === 1 ? "" : "s"}: ${promptList}`;
}

export function isInquiryTemplateSubstantiallyModified(message: string, template: string) {
  if (message === template) return false;

  let prefixLength = 0;
  const sharedLength = Math.min(message.length, template.length);
  while (prefixLength < sharedLength && message[prefixLength] === template[prefixLength]) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < sharedLength - prefixLength
    && message[message.length - 1 - suffixLength] === template[template.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const changedSpan = Math.max(message.length, template.length) - prefixLength - suffixLength;
  return changedSpan >= 40 || Math.abs(message.length - template.length) >= 20;
}
