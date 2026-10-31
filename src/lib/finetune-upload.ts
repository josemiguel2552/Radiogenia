/**
 * Handing a finished training file to the provider that will train on it.
 *
 * Shared because two routes need it: the upload the admin triggers, and the
 * augmentation, which produces a file far too large to hand back through the
 * browser just so the browser can post it somewhere.
 */

import type { FinetuneProviderSpec } from "./finetune-providers";

export interface UploadResult {
  fileId?: string;
  error?: string;
}

export async function uploadJsonlToProvider(
  spec: FinetuneProviderSpec,
  apiKey: string,
  jsonl: string,
  fileName = "training_data.jsonl",
): Promise<UploadResult> {
  const form = new FormData();
  form.append("purpose", "fine-tune");
  form.append("file", new Blob([jsonl], { type: "application/jsonl" }), fileName);
  // Together rejects a file whose type it cannot tell; OpenAI ignores this.
  if (spec.id === "together") form.append("file_name", fileName);

  const res = await fetch(spec.endpoints.upload, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  // Read as text first: an error from the platform in front of the provider
  // is not JSON, and parsing it blind is what produced "Unexpected token 'R'".
  const raw = await res.text();
  if (!res.ok) {
    return { error: `${spec.label} file upload failed (${res.status}): ${raw.slice(0, 600)}` };
  }

  let data: Record<string, unknown> = {};
  try { data = JSON.parse(raw); } catch { /* reported below */ }

  const fileId = (data.id as string) || (data.file_id as string) || "";
  if (!fileId) {
    return { error: `${spec.label} accepted the file but returned no id: ${raw.slice(0, 400)}` };
  }
  return { fileId };
}
