import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const [{ data: orgs, error }, { data: memberRows }] = await Promise.all([
      service
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      service
        .from("org_members")
        .select("org_id")
        .eq("is_active", true),
    ]);

    if (error) return dbErrorResponse(error);

    const countMap = new Map<string, number>();
    for (const m of memberRows || []) {
      countMap.set(m.org_id, (countMap.get(m.org_id) || 0) + 1);
    }

    const enriched = (orgs || []).map((org) => ({
      ...org,
      active_members: countMap.get(org.id) || 0,
    }));

    return NextResponse.json(enriched, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAdmin();
    const service = createServiceClient();

    const { name, slug, billing_email, max_seats, region, billing_mode } = await req.json();
    if (!name || !slug) {
      return NextResponse.json({ error: "Missing name or slug" }, { status: 400 });
    }

    const { data, error } = await service
      .from("organizations")
      .insert({
        name,
        slug,
        billing_email: billing_email || null,
        max_seats: max_seats || 50,
        // Which legal regime its radiologists work under, and whether the
        // institution is buying seats or being given them. null region keeps
        // the old behaviour of inferring per user.
        ...(region === "eu" || region === "us" || region === "open" ? { region } : {}),
        ...(billing_mode === "gifted" ? { billing_mode } : {}),
        created_by: userId,
      })
      .select()
      .single();

    if (error) return dbErrorResponse(error);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const { id, name, slug, billing_email, max_seats, is_active, is_pilot, region, billing_mode } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing organization id" }, { status: 400 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) update.name = name;
    if (slug !== undefined) update.slug = slug;
    if (billing_email !== undefined) update.billing_email = billing_email;
    if (max_seats !== undefined) update.max_seats = max_seats;
    if (is_active !== undefined) update.is_active = is_active;
    if (is_pilot !== undefined) update.is_pilot = is_pilot;
    if (region !== undefined) update.region = region === "" ? null : region;
    if (billing_mode === "paid" || billing_mode === "gifted") update.billing_mode = billing_mode;

    const { error } = await service.from("organizations").update(update).eq("id", id);
    if (error) return dbErrorResponse(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Tables that hang off an organization, in the order they have to go: seat
 * invites point at seat orders, so the orders cannot leave first.
 *
 * The migrations declare these foreign keys as `on delete cascade`, which would
 * make the cleanup unnecessary — but a cascade that is missing on the live
 * database turns the delete into a constraint violation and leaves the admin
 * with a hospital they cannot remove. Clearing the children explicitly costs
 * one round trip each and works either way.
 */
const ORG_CHILD_TABLES = [
  "org_seat_invites",
  "org_seat_orders",
  "org_members",
  "org_sections",
  "org_templates",
  "org_normality_phrases",
  "org_recommendations",
  "support_tickets",
  "report_metrics",
  "pilot_survey_responses",
  "consent_records",
] as const;

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing organization id" }, { status: 400 });

    const { data: org } = await service
      .from("organizations")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    // The radiologists' own accounts are deliberately kept — deleting a
    // hospital withdraws its unlimited access, it does not erase the people.
    // Detaching them here rather than relying on `on delete set null` for the
    // same reason as the children above.
    await service.from("profiles").update({ org_id: null }).eq("org_id", id);

    for (const table of ORG_CHILD_TABLES) {
      // A table absent from this database is not a failure: nothing references
      // the organization from it. Any real error surfaces on the delete below.
      await service.from(table).delete().eq("org_id", id);
    }

    const { error } = await service.from("organizations").delete().eq("id", id);
    if (error) return dbErrorResponse(error);
    return NextResponse.json({ ok: true, name: org.name });
  } catch (error) {
    return toErrorResponse(error);
  }
}
