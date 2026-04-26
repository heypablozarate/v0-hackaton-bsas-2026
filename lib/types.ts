export type Category =
  | "privacy"
  | "control"
  | "liability"
  | "content_rights"
  | "payments"
  | "termination"
  | "other";

export interface AnalyzedParagraph {
  text: string;
  severity: 1 | 2 | 3 | 4 | 5;
  category: Category;
  translation: string;
  /** keyword matches (only populated by local fallback analyzer) */
  matches?: string[];
}
