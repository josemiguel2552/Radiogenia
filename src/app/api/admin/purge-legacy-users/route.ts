import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Admin tool: purge legacy accounts created before the card-first cutover
 * (2026-07-26). Safety rails, all enforced server-side on BOTH preview and
 * deletion (the client's list is never trusted):
 *   - never admins, never org/hospital members
 *   - never anyone with a Stripe subscription or a non-free plan
 *   - only accounts created before the cutoff
 * Country/hospital/role + signup date are archived anonymously to
 * signup_archive before each deletion.
 */

const CUTOFF = "2026-07-26T00:00:00.000Z";
const MAX_BATCH = 300;

type Candidate = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  country: string | null;
  hospital: string | null;
  professional_role: string | null;
  subscription_plan: string | null;
  email_verified: boolean | null;
  report_count?: number;
};

async function fetchCandidates(service: ReturnType<typeof createServiceClient>): Promise<Candidate[]> {
  const { data, error } = await service
    .from("profiles")
    .select("id, email, name, created_at, country, hospital, professional_role, subscription_plan, email_verified, role, org_id, stripe_subscription_id")
    .lt("created_at", CUTOFF)
    .neq("role", "admin")
    .is("org_id", null)
    .is("stripe_subscription_id", null)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) throw error;
  return (data || []).filter(
    (p) => !p.subscription_plan || p.subscription_plan === "free",
  ) as Candidate[];
}

export async function GET() {
  try {
    await requireAdmin();
    const service = createServiceClient();
    const candidates = await fetchCandidates(service);

    // Report counts help the admin spot accounts worth keeping.
    const countMap = new Map<string, number>();
    try {
      const { data: reports } = await service.from("reports").select("user_id").limit(50000);
      for (const r of reports || []) countMap.set(r.user_id, (countMap.get(r.user_id) || 0) + 1);
    } catch { /* optional */ }

    return NextResponse.json({
      cutoff: CUTOFF,
      candidates: candidates.map((c) => ({
        id: c.id,
        email: c.email,
        name: c.name,
        created_at: c.created_at,
        country: c.country,
        hospital: c.hospital,
        plan: c.subscription_plan || "free",
        email_verified: c.email_verified,
        report_count: countMap.get(c.id) || 0,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { userIds } = await req.json();
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "userIds required" }, { status: 400 });
    }
    if (userIds.length > MAX_BATCH) {
      return NextResponse.json({ error: `Max ${MAX_BATCH} per run` }, { status: 400 });
    }

    const service = createServiceClient();
    // Re-derive the eligible set server-side; only ids in BOTH lists die.
    const eligible = new Map((await fetchCandidates(service)).map((c) => [c.id, c]));

    let deleted = 0;
    let archived = 0;
    const errors: string[] = [];
    let archiveAvailable = true;

    for (const id of userIds as string[]) {
      const c = eligible.get(id);
      if (!c) {
        errors.push(`${id}: not eligible (skipped)`);
        continue;
      }
      // Archive anonymously first — deletion only proceeds if archiving
      // worked (or the archive table doesn't exist yet, which we surface).
      if (archiveAvailable) {
        const { error: archErr } = await service.from("signup_archive").insert({
          country: c.country,
          hospital: c.hospital,
          professional_role: c.professional_role,
          plan: c.subscription_plan || "free",
          signup_at: c.created_at,
        });
        if (archErr) {
          if (archErr.message?.includes("signup_archive")) {
            return NextResponse.json(
              { error: "signup_archive table missing — run the 20260728_signup_archive migration first", deleted, archived },
              { status: 409 },
            );
          }
          errors.push(`archive ${c.email}: ${archErr.message}`);
          continue;
        }
        archived += 1;
      }

      const { error: delErr } = await service.auth.admin.deleteUser(id);
      if (delErr) {
        errors.push(`${c.email}: ${delErr.message}`);
        continue;
      }
      deleted += 1;
      console.log(`[purge-legacy] deleted ${c.email} (signed up ${c.created_at})`);
    }

    return NextResponse.json({ ok: true, deleted, archived, errors });
  } catch (error) {
    return toErrorResponse(error);
  }
}
