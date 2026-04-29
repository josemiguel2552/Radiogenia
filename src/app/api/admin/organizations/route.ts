import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const { data: orgs, error } = await service
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Enrich with member counts
    const enriched = await Promise.all((orgs || []).map(async (org) => {
      const { count } = await service
        .from("org_members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", org.id)
        .eq("is_active", true);

      return { ...org, active_members: count || 0 };
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const { id, name, slug, billing_email, max_seats, is_active } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing organization id" }, { status: 400 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) update.name = name;
    if (slug !== undefined) update.slug = slug;
    if (billing_email !== undefined) update.billing_email = billing_email;
    if (max_seats !== undefined) update.max_seats = max_seats;
    if (is_active !== undefined) update.is_active = is_active;

    const { error } = await service.from("organizations").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
