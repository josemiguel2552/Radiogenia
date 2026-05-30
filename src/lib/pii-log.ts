import { createServiceClient } from "@/lib/supabase/service";

export function logPiiStrip(
  userId: string,
  endpoint: string,
  strippedCount: number,
  strippedTypes: Record<string, number>,
) {
  if (strippedCount === 0) return;

  const supabase = createServiceClient();
  Promise.resolve(
    supabase
      .from("audit_logs")
      .insert({
        user_id: userId,
        action: "pii_stripped",
        metadata: { endpoint, strippedCount, strippedTypes },
      })
  ).catch(() => {});
}
