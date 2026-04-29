import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const url = new URL(req.url);
    const orgId = url.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ error: "Missing org_id" }, { status: 400 });

    const { data, error } = await service
      .from("org_members")
      .select("*, profiles(email, name), org_sections(name)")
      .eq("org_id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const mapped = (data || []).map((m) => {
      const profile = m.profiles as { email: string; name: string } | null;
      const section = m.org_sections as { name: string } | null;
      const { profiles: _p, org_sections: _s, ...rest } = m;
      return {
        ...rest,
        user_email: profile?.email ?? null,
        user_name: profile?.name ?? null,
        section_name: section?.name ?? null,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const { org_id, email, section_id, section_role, is_org_chief } = await req.json();
    if (!org_id || !email) {
      return NextResponse.json({ error: "Missing org_id or email" }, { status: 400 });
    }

    // Look up user by email
    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check seat limit
    const { data: org, error: orgError } = await service
      .from("organizations")
      .select("max_seats")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { count } = await service
      .from("org_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org_id)
      .eq("is_active", true);

    if ((count ?? 0) >= org.max_seats) {
      return NextResponse.json({ error: "Seat limit reached" }, { status: 409 });
    }

    // Upsert member (allows reactivation of previously deactivated members)
    const { data, error } = await service
      .from("org_members")
      .upsert(
        {
          org_id,
          user_id: profile.id,
          section_id: section_id || null,
          section_role: section_role || "radiologist",
          is_org_chief: is_org_chief ?? false,
          is_active: true,
          deactivated_at: null,
        },
        { onConflict: "org_id,user_id" }
      )
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

    const { id, section_id, section_role, is_org_chief, is_active } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing member id" }, { status: 400 });

    const update: Record<string, unknown> = {};
    if (section_id !== undefined) update.section_id = section_id;
    if (section_role !== undefined) update.section_role = section_role;
    if (is_org_chief !== undefined) update.is_org_chief = is_org_chief;

    if (is_active !== undefined) {
      update.is_active = is_active;
      update.deactivated_at = is_active ? null : new Date().toISOString();
    }

    const { error } = await service.from("org_members").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
