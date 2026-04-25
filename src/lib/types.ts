export type UserRole = "admin" | "radiologist";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  subscription_status: string;
  created_at: string;
}

export interface GlobalModelConfig {
  id: string;
  provider: AIProvider;
  model_name: string;
  api_key_encrypted: string;
  custom_base_url: string;
  updated_at: string;
  updated_by: string | null;
}

export interface Template {
  id: number;
  title: string;
  template: string;
  technique: string;
  section: string;
}

export interface UserTemplate {
  id: string;
  user_id: string;
  name: string;
  modality: string;
  base_template_id: number | null;
  structure: Template;
  is_default: boolean;
  created_at: string;
}

export interface UserRecommendation {
  id: string;
  user_id: string;
  trigger_keyword: string;
  recommendation_text: string;
  source: "manual" | "pdf_extracted";
  guideline_name: string;
  created_at: string;
}

export type AIProvider = "claude" | "openai" | "deepseek" | "gemini" | "custom";
export type FindingsLength = "concise" | "standard" | "detailed";
export type NormalFieldsVerbosity = "minimal" | "standard" | "explicit";
export type ParaphraseLevel = "none" | "light" | "free";
export type OutputLanguage = "es" | "en" | "pt" | "fr" | "de" | "it";

export interface UserModelConfig {
  id: string;
  user_id: string;
  provider: AIProvider;
  model_name: string;
  api_key_encrypted: string;
  custom_base_url?: string;
  findings_length: FindingsLength;
  normal_fields_verbosity: NormalFieldsVerbosity;
  paraphrase_level: ParaphraseLevel;
  output_language: OutputLanguage;
  style_learning_enabled: boolean;
  style_sample_count: number;
  few_shot_count: number;
  created_at: string;
  updated_at: string;
}

export interface StyleSample {
  id: string;
  user_id: string;
  report_id: string | null;
  findings_text: string;
  conclusion_text: string;
  modality: string;
  study_type: string;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  study_type: string;
  modality: string;
  contrast_option: string;
  raw_dictation: string;
  findings_text: string;
  conclusion_text: string;
  recommendations_text: string;
  initial_findings_text?: string;
  initial_conclusion_text?: string;
  created_at: string;
  template_snapshot: Template;
  model_config_snapshot: UserModelConfig;
}

export type StylePatternKind = "normal_phrase" | "conclusion_phrase" | "conclusion_sample";

export interface StylePattern {
  id: string;
  user_id: string;
  modality: string;
  study_type: string;
  kind: StylePatternKind;
  label: string | null;
  phrase: string;
  frequency: number;
  last_seen_at: string;
  created_at: string;
}

export interface PreferredNormalPhrase {
  label: string;
  phrase: string;
}

export const MODALITIES = [
  "CT",
  "MRI",
  "Ultrasound",
  "XRay",
  "Mammography",
  "Procedures",
] as const;

export const SECTIONS = [
  "Head and neck",
  "Thorax",
  "Abdomen and pelvis",
  "Spine",
  "Upper limbs",
  "Lower limbs",
] as const;

export const PROVIDERS: { value: AIProvider; label: string; models: string[] }[] = [
  { value: "claude", label: "Claude (Anthropic)", models: ["claude-sonnet-4-20250514", "claude-haiku-4-5-20251001"] },
  { value: "openai", label: "GPT (OpenAI)", models: ["gpt-4o", "gpt-4o-mini"] },
  { value: "deepseek", label: "DeepSeek", models: ["deepseek-chat", "deepseek-reasoner"] },
  { value: "gemini", label: "Gemini (Google)", models: ["gemini-1.5-pro", "gemini-2.0-flash"] },
  { value: "custom", label: "Custom Endpoint", models: [] },
];

export const LANGUAGES: { value: OutputLanguage; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
];
