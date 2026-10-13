export type ResumeTextCandidate = {
  id: string;
  value: string;
  source: string;
};

export type ResumeSkillCandidate = ResumeTextCandidate & {
  skillId: string;
};

export type ResumeLinkCandidate = ResumeTextCandidate & {
  type: "linkedin" | "github" | "portfolio";
  label: string;
  url: string;
};

export type ResumeCandidates = {
  skills: ResumeSkillCandidate[];
  education: ResumeTextCandidate[];
  experience: ResumeTextCandidate[];
  links: ResumeLinkCandidate[];
};
