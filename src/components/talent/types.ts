export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterMetadata {
  skills: FilterOption[];
  availability: FilterOption[];
  status: FilterOption[];
}

export interface TalentDirectoryItem {
  id: string;
  name: string;
  headline: string;
  status: "current" | "alumni";
  skills: string[];
  availability: Array<"internship" | "full-time" | "contract">;
  projectEvidenceCount: number;
}

export interface TalentDirectoryResponse {
  items: TalentDirectoryItem[];
  count: number;
}

export interface TalentFilters {
  q: string;
  skill: string[];
  availability: string[];
  status: string[];
}
