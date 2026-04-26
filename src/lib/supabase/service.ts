import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createClient<any>> | null = null;

export function createServiceClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client = createClient<any>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}
