/**
 * The prompt a fine-tuning example is trained against.
 *
 * It has to be the prompt production actually sends. A fine-tune learns a
 * mapping from input to output, and if the input it saw in training is not
 * the input it meets in service, most of what it learned does not apply — it
 * is the standard train/serve skew, and it shows up as a model that is
 * brilliant on some reports and erratic on others.
 *
 * The generator used to pair every example with a 45-word English instruction
 * while the conclusion route sent some 2,500 tokens of Spanish rules. This
 * module exists so both sides are built by the same function.
 */

import { buildConclusionPrompt } from "./prompts";
import type { ConclusionStyle, OutputLanguage } from "./types";

/**
 * Which style the stored conclusion was written in.
 *
 * The prompt carries a style block, so pairing a numbered conclusion with the
 * rules for a different shape would teach the model to ignore them. Read off
 * the text itself rather than guessed from configuration, which records what
 * the account prefers today, not what produced this conclusion.
 */
export function inferConclusionStyle(conclusionText: string): ConclusionStyle {
  return /^\s*\d+\.\s/m.test(conclusionText) ? "concise" : "evolutive";
}

/** Spanish and Portuguese share most accented characters, so the tell is words. */
const PT_MARKERS = [" não ", " achados", " ausência", " são ", " em relação", " lesão ", " nódulo pulmonar direito"];
const ES_MARKERS = [" no se ", " hallazgos", " ausencia", " son ", " respecto a", " lesión ", " derecho."];
const EN_MARKERS = [" the ", " no evidence", " findings", " lesion ", " right ", " with "];

/**
 * The language a stored conclusion is written in. Reports do not record it,
 * and training a Spanish conclusion against an English rulebook would teach
 * the model to answer in the wrong language.
 */
export function inferLanguage(text: string): OutputLanguage {
  const t = ` ${text.toLowerCase()} `;
  const count = (markers: string[]) => markers.reduce((n, m) => n + (t.includes(m) ? 1 : 0), 0);
  const pt = count(PT_MARKERS);
  const es = count(ES_MARKERS);
  const en = count(EN_MARKERS);
  if (pt > es && pt >= en) return "pt";
  if (en > es && en > pt) return "en";
  return "es";
}

export interface TrainingPromptInput {
  findingsText: string;
  conclusionText: string;
  clinicalInfo?: string | null;
}

/**
 * The system and user messages for one training example — the same pair the
 * conclusion route builds at inference time, for the same case.
 */
export function buildTrainingPrompt(input: TrainingPromptInput): { system: string; user: string } {
  const outputLanguage = inferLanguage(input.conclusionText);
  const conclusionStyle = inferConclusionStyle(input.conclusionText);

  // buildConclusionPrompt takes no modality or study type — the conclusion
  // route does not send them either, so neither does this. Matching what
  // production sends is the whole point.
  return buildConclusionPrompt({
    findingsText: input.findingsText,
    clinicalInfo: input.clinicalInfo || "",
    outputLanguage,
    conclusionStyle,
  });
}
