export type SampleSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type SampleCategory =
  | "seo"
  | "performance"
  | "security"
  | "ux_mobile"
  | "accessibility"
  | "content";

export type SampleOwner = "seo" | "developer" | "content_manager" | "hosting_admin";

export type SampleDifficulty = "easy" | "medium" | "hard";

export type SampleLocale = "fa" | "en";

export type LocalizedText = Record<SampleLocale, string>;

export type SampleFinding = {
  code: string;
  severity: SampleSeverity;
  category: SampleCategory;
  title: LocalizedText;
  description: LocalizedText;
  recommendation: LocalizedText;
  evidence: LocalizedText;
  impact: LocalizedText;
  owner: SampleOwner;
  difficulty: SampleDifficulty;
};

export type ChecklistItem = {
  key: string;
  label: LocalizedText;
  status: "present" | "missing";
};

export const SEVERITY_ORDER: SampleSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export const CATEGORY_ORDER: SampleCategory[] = [
  "security",
  "performance",
  "seo",
  "ux_mobile",
  "accessibility",
  "content",
];

export const SAMPLE_DEMO_URL = "https://anonymous-example.ir";

export const SAMPLE_OVERALL_SCORE = 58;
export const SAMPLE_SCORE_GRADE = "D";