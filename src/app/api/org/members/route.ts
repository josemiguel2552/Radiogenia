import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOrgMembership, requireOrgRole } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await requireOrgMembership(user.id);

    const { data, error } = await supabase
      .from("org_members")
      .select("*, profiles(email, name), org_sections(name)")
      .eq("org_id", membership.org_id)
      .order("joined_at");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const members = (data || []).map((m) => {
      const profile = m.profiles as unknown as { email: string; name: string } | null;
      const section = m.org_sections as unknown as { name: string } | null;
      return {
        ...m,
        profiles: undefined,
        org_sections: undefined,
        user_email: profile?.email || "",
        user_name: profile?.name || "",
        section_name: section?.name || null,
      };
    });

    return NextResponse.json(members);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief"],
    });

    const { user_id, section_id, section_role, is_org_chief } = await req.json();
    if (!user_id || !section_id) {
      return NextResponse.json({ error: "Missing user_id or section_id" }, { status: 400 });
    }

    // Section chiefs can only add radiologists/editors to their own section
    if (!membership.is_org_chief) {
      if (section_id !== membership.section_id) {
        return NextResponse.json({ error: "Cannot add members to another section" }, { status: 403 });
      }
      if (is_org_chief || section_role === "section_chief") {
        return NextResponse.json({ error: "Cannot assign chief roles" }, { status: 403 });
      }
    }

    // Check seat limit
    const service = createServiceClient();
    const { data: org } = await service
      .from("organizations")
      .select("max_seats")
      .eq("id", membership.org_id)
      .single();

    const { count } = await service
      .from("org_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", membership.org_id)
      .eq("is_active", true);

    if (org && count !== null && count >= org.max_seats) {
      return NextResponse.json({ error: "Seat limit reached" }, { status: 429 });
    }

    const { data, error } = await supabase
      .from("org_members")
      .upsert({
        org_id: membership.org_id,
        user_id,
        section_id,
        section_role: section_role || "radiologist",
        is_org_chief: is_org_chief || false,
        is_active: true,
        deactivated_at: null,
      }, { onConflict: "org_id,user_id" })
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief"],
    });

    const { id, section_id, section_role, is_org_chief, is_active } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing member id" }, { status: 400 });

    // Validate permissions for non-chiefs
    if (!membership.is_org_chief) {
      if (is_org_chief !== undefined || section_role === "section_chief") {
        return NextResponse.json({ error: "Cannot modify chief roles" }, { status: 403 });
      }
    }

    const update: Record<string, unknown> = {};
    if (section_id !== undefined) update.section_id = section_id;
    if (section_role !== undefined) update.section_role = section_role;
    if (is_org_chief !== undefined) update.is_org_chief = is_org_chief;
    if (is_active !== undefined) {
      update.is_active = is_active;
      update.deactivated_at = is_active ? null : new Date().toISOString();
    }

    const { error } = await supabase
      .from("org_members")
      .update(update)
      .eq("id", id)
      .eq("org_id", membership.org_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
