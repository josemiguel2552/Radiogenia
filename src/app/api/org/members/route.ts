import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOrgMembership, requireOrgRole } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await requireOrgMembership(user.id);
    const service = createServiceClient();

    const { data, error } = await service
      .from("org_members")
      .select("*, org_sections(name)")
      .eq("org_id", membership.org_id)
      .order("joined_at");

    if (error) return dbErrorResponse(error);

    const userIds = (data || []).map((m) => m.user_id as string);
    const { data: profiles } = userIds.length > 0
      ? await service.from("profiles").select("id, email, name").in("id", userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const members = (data || []).map((m) => {
      const profile = profileMap.get(m.user_id);
      const section = m.org_sections as { name: string } | null;
      const { org_sections: _s, ...rest } = m;
      return {
        ...rest,
        user_email: profile?.email || "",
        user_name: profile?.name || "",
        section_name: section?.name || null,
      };
    });

    return NextResponse.json(members, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return toErrorResponse(error);
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

    const { user_id, email, section_id, section_role, is_org_chief } = await req.json();
    const service = createServiceClient();

    let resolvedUserId = user_id;
    if (!resolvedUserId && email) {
      const { data: profile } = await service
        .from("profiles")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .single();
      if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });
      resolvedUserId = profile.id;
    }

    if (!resolvedUserId) {
      return NextResponse.json({ error: "Missing user_id or email" }, { status: 400 });
    }

    if (!membership.is_org_chief) {
      if (section_id !== membership.section_id) {
        return NextResponse.json({ error: "Cannot add members to another section" }, { status: 403 });
      }
      if (is_org_chief || section_role === "section_chief") {
        return NextResponse.json({ error: "Cannot assign chief roles" }, { status: 403 });
      }
    }

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

    const { data, error } = await service
      .from("org_members")
      .upsert({
        org_id: membership.org_id,
        user_id: resolvedUserId,
        section_id,
        section_role: section_role || "radiologist",
        is_org_chief: is_org_chief || false,
        is_active: true,
        deactivated_at: null,
      }, { onConflict: "org_id,user_id" })
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief"],
    });

    const { id, section_id, section_role, is_org_chief, is_active } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing member id" }, { status: 400 });

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

    const service = createServiceClient();
    const { error } = await service
      .from("org_members")
      .update(update)
      .eq("id", id)
      .eq("org_id", membership.org_id);

    if (error) return dbErrorResponse(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
