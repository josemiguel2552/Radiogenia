export type UserRole = "admin" | "radiologist";
export type SubscriptionPlan = "free" | "resident" | "starter" | "professional" | "unlimited";

export const CURRENCY = "$";

/** Card-first trial: 7 free days, then the Starter charge unless canceled. */
export const TRIAL_DAYS = 7;

/** Plans offered to individual users. "free" is only an internal state
    (no active subscription → paywalled) and "resident" is legacy-only. */
export const PUBLIC_PLANS: SubscriptionPlan[] = ["starter", "professional"];

export interface PlanConfig {
  name: string;
  label: string;
  price: number;
  reports: number;
  tokensPerReport: number;
  dictationMinutes: number;
  guidelineDocuments: number;
  features: string[];
  highlight?: boolean;
  stripePriceId?: string;
}

export const PLANS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    name: "free",
    label: "Free",
    price: 0,
    reports: 20,
    tokensPerReport: 10000,
    dictationMinutes: 30,
    guidelineDocuments: 2,
    features: [
      "plan.feat.reports_20",
      "plan.feat.all_modalities",
      "plan.feat.dictation_30",
      "plan.feat.style_learning",
      "plan.feat.custom_templates",
      "plan.feat.guidelines_2",
    ],
  },
  resident: {
    name: "resident",
    label: "Residente",
    price: 4.99,
    reports: 150,
    tokensPerReport: 10000,
    dictationMinutes: 120,
    guidelineDocuments: 5,
    features: [
      "plan.feat.reports_150",
      "plan.feat.all_modalities",
      "plan.feat.dictation_120",
      "plan.feat.style_learning",
      "plan.feat.custom_templates",
      "plan.feat.guidelines_5",
      "plan.feat.resident_verified",
    ],
  },
  starter: {
    name: "starter",
    label: "Starter",
    price: 7.99,
    reports: 150,
    tokensPerReport: 10000,
    dictationMinutes: 120,
    guidelineDocuments: 5,
    highlight: true,
    features: [
      "plan.feat.reports_150",
      "plan.feat.all_modalities",
      "plan.feat.dictation_120",
      "plan.feat.style_learning",
      "plan.feat.custom_templates",
      "plan.feat.guidelines_5",
      "plan.feat.priority_support",
    ],
  },
  professional: {
    name: "professional",
    label: "Professional",
    price: 15.99,
    reports: 400,
    tokensPerReport: 10000,
    dictationMinutes: 300,
    guidelineDocuments: 15,
    features: [
      "plan.feat.reports_400",
      "plan.feat.all_modalities",
      "plan.feat.dictation_300",
      "plan.feat.style_learning",
      "plan.feat.custom_templates",
      "plan.feat.guidelines_15",
      "plan.feat.priority_support",
      "plan.feat.api_access",
      "plan.feat.bulk_export",
    ],
  },
  // On-request plan: not shown on the pricing page, sold via direct link.
  // The high numbers act as "unlimited" for the shared quota machinery.
  unlimited: {
    name: "unlimited",
    label: "Ilimitado",
    price: 19.90,
    reports: 100000,
    tokensPerReport: 10000,
    dictationMinutes: 100000,
    guidelineDocuments: 100,
    features: [
      "plan.feat.reports_unlimited",
      "plan.feat.all_modalities",
      "plan.feat.dictation_unlimited",
      "plan.feat.style_learning",
      "plan.feat.custom_templates",
      "plan.feat.guidelines_15",
      "plan.feat.priority_support",
      "plan.feat.api_access",
      "plan.feat.bulk_export",
    ],
  },
};

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  subscription_plan: SubscriptionPlan;
  reports_used_this_month: number;
  billing_period_start: string;
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
  is_global?: boolean;
  is_org?: boolean;
  section_name?: string;
  created_at: string;
}

export type AIProvider = "claude" | "openai" | "deepseek" | "gemini" | "openrouter" | "custom";
export type FindingsLength = "concise" | "standard" | "detailed";
export type NormalFieldsVerbosity = "minimal" | "standard" | "explicit";
export type ParaphraseLevel = "none" | "light" | "free";
export type ConclusionStyle = "concise" | "grouped";
export type OutputLanguage = "es" | "en" | "pt";
export type DictationLanguage = OutputLanguage | "auto";

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
  dictation_language: DictationLanguage;
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

export interface Signature {
  id: string;
  user_id: string;
  label: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const MODALITIES = [
  "CT",
  "MRI",
  "Ultrasound",
  "XRay",
  "Mammography",
  "RECIST",
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
  { value: "claude", label: "Claude (Anthropic)", models: ["claude-sonnet-4-6-20250514", "claude-haiku-4-5-20251001"] },
  { value: "openai", label: "GPT (OpenAI)", models: ["gpt-4o", "gpt-4o-mini"] },
  { value: "deepseek", label: "DeepSeek", models: ["deepseek-v4-pro", "deepseek-v4-flash"] },
  { value: "gemini", label: "Gemini (Google)", models: ["gemini-1.5-pro", "gemini-2.0-flash"] },
  { value: "openrouter", label: "OpenRouter", models: ["qwen/qwen-2.5-72b-instruct", "qwen/qwen2.5-32b-instruct", "meta-llama/llama-3.3-70b-instruct", "mistralai/mistral-small-24b-instruct-2501", "deepseek/deepseek-chat"] },
  { value: "custom", label: "Custom Endpoint", models: [] },
];

export const LANGUAGES: { value: OutputLanguage; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português (BR)" },
];

export const DICTATION_LANGUAGES: { value: DictationLanguage; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  ...LANGUAGES,
];

/* ── Hospital / Organization types ─────────────────────────── */

export type SectionRole = "section_chief" | "section_editor" | "radiologist";
export type StaffType = "attending" | "resident";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  billing_email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  max_seats: number;
  is_active: boolean;
  is_pilot: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgSection {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  section_id: string | null;
  is_org_chief: boolean;
  section_role: SectionRole;
  staff_type: StaffType;
  is_active: boolean;
  joined_at: string;
  deactivated_at: string | null;
  // Joined fields from queries
  user_email?: string;
  user_name?: string;
  section_name?: string;
}

export interface OrgMembership {
  org_id: string;
  org_name: string;
  section_id: string | null;
  section_name: string | null;
  is_org_chief: boolean;
  section_role: SectionRole;
  staff_type: StaffType;
}

export interface OrgTemplate {
  id: string;
  org_id: string;
  section_id: string;
  name: string;
  modality: string;
  base_template_id: number | null;
  structure: unknown;
  section_name?: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgNormalityPhrase {
  id: string;
  org_id: string;
  section_id: string;
  modality: string;
  section_label: string;
  phrase: string;
  created_by: string | null;
  updated_at: string;
}

export type SupportTicketCategory = "error" | "question" | "complaint" | "general";
export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface SupportTicket {
  id: string;
  org_id: string | null;
  user_id: string;
  subject: string;
  body: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  admin_reply: string | null;
  admin_user_id: string | null;
  replied_at: string | null;
  created_at: string;
  // Joined fields
  user_email?: string;
  user_name?: string;
  org_name?: string;
}

/* ── Manual Recommendations ───────────────────────────── */

export interface ManualRecommendation {
  id: string;
  category: string;
  modality: string;
  title: Record<string, string>;
  text: Record<string, string>;
  tags: string[];
  source: string;
  scope: "system" | "org" | "user";
  user_id?: string;
  overrides?: string;
}

export type ResidentVerificationStatus = "pending" | "approved" | "rejected";

export interface ResidentVerification {
  id: string;
  user_id: string;
  document_url: string;
  residency_start: string;
  residency_end: string;
  institution_name: string;
  status: ResidentVerificationStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
  /** True when the resident plan is already active (paid) for this user. */
  plan_active?: boolean;
}
