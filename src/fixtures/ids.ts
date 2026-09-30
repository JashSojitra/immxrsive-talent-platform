import { createHash } from "node:crypto";

export function skillIdForName(name: string) {
  return `skill_${stableHash(name)}`;
}

export function professionalLinkId(studentId: string, linkType: string) {
  return `student_link_${stableHash(`${studentId}\0${linkType}`)}`;
}

export function projectAssetId(projectId: string, assetType: string) {
  return `project_asset_${stableHash(`${projectId}\0${assetType}`)}`;
}

function stableHash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 20);
}
