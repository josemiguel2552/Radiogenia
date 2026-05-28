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

    const { name, slug, billing_email, max_seats } = await req.json();
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

    const { id, name, slug, billing_email, max_seats, is_active, is_pilot } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing organization id" }, { status: 400 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) update.name = name;
    if (slug !== undefined) update.slug = slug;
    if (billing_email !== undefined) update.billing_email = billing_email;
    if (max_seats !== undefined) update.max_seats = max_seats;
    if (is_active !== undefined) update.is_active = is_active;
    if (is_pilot !== undefined) update.is_pilot = is_pilot;

    const { error } = await service.from("organizations").update(update).eq("id", id);
    if (error) return dbErrorResponse(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing organization id" }, { status: 400 });

    const { error } = await service.from("organizations").delete().eq("id", id);
    if (error) return dbErrorResponse(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
