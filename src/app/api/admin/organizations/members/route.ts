import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const url = new URL(req.url);
    const orgId = url.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ error: "Missing org_id" }, { status: 400 });

    const { data, error } = await service
      .from("org_members")
      .select("*, org_sections(name)")
      .eq("org_id", orgId)
      .order("joined_at");

    if (error) return dbErrorResponse(error);

    const userIds = (data || []).map((m) => m.user_id as string);
    const { data: profiles } = userIds.length > 0
      ? await service.from("profiles").select("id, email, name, subspecialties, avg_reports_month, reports_used_this_month, dictation_seconds_used, billing_period_start").in("id", userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // Counters renew on the 1st of the calendar month for hospital members.
    const now = new Date();
    const isStale = (start: string | null | undefined) => {
      if (!start) return true;
      const p = new Date(start);
      return p.getUTCFullYear() !== now.getUTCFullYear() || p.getUTCMonth() !== now.getUTCMonth();
    };

    const mapped = (data || []).map((m) => {
      const profile = profileMap.get(m.user_id) as Record<string, unknown> | undefined;
      const section = m.org_sections as { name: string } | null;
      const { org_sections: _s, ...rest } = m;
      const stale = isStale(profile?.billing_period_start as string);
      return {
        ...rest,
        user_email: (profile?.email as string) ?? null,
        user_name: (profile?.name as string) ?? null,
        section_name: section?.name ?? null,
        subspecialties: (profile?.subspecialties as string[]) ?? [],
        avg_reports_month: (profile?.avg_reports_month as number) ?? null,
        // Every generated report (not just saved ones) — the profile counter.
        reports_this_month: stale ? 0 : ((profile?.reports_used_this_month as number) || 0),
        dictation_minutes: stale ? 0 : Math.round(((profile?.dictation_seconds_used as number) || 0) / 60),
      };
    });

    return NextResponse.json(mapped, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const { org_id, email, name, password, section_id, section_role, is_org_chief, staff_type } = await req.json();
    if (!org_id || !email) {
      return NextResponse.json({ error: "Missing org_id or email" }, { status: 400 });
    }

    // Check seat limit
    const { data: org } = await service
      .from("organizations")
      .select("max_seats")
      .eq("id", org_id)
      .single();

    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const { count } = await service
      .from("org_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org_id)
      .eq("is_active", true);

    if ((count ?? 0) >= org.max_seats) {
      return NextResponse.json({ error: "Seat limit reached" }, { status: 409 });
    }

    let userId: string;

    // Check if user already exists
    const { data: existingProfile } = await service
      .from("profiles")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
      await service.from("profiles").update({ approved: true }).eq("id", userId);
    } else {
      // Create new user account
      if (!password || password.length < 6) {
        return NextResponse.json({ error: "Password required (minimum 6 characters) for new user" }, { status: 400 });
      }

      const { data: authData, error: authError } = await service.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { name: name?.trim() || "" },
      });

      if (authError || !authData.user) {
        const msg = authError?.message || "Failed to create user";
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      userId = authData.user.id;

      // Ensure profile exists (trigger should create it, but be safe)
      await service.from("profiles").upsert({
        id: userId,
        email: email.trim().toLowerCase(),
        name: name?.trim() || "",
        role: "radiologist",
        subscription_plan: "free",
        approved: true,
      });

      // Ensure model config exists
      await service.from("user_model_config").upsert(
        { user_id: userId },
        { onConflict: "user_id" },
      );
    }

    // Upsert org membership (allows reactivation)
    const memberPayload = {
      org_id,
      user_id: userId,
      section_id: section_id || null,
      section_role: section_role || "radiologist",
      staff_type: staff_type || "attending",
      is_org_chief: is_org_chief ?? false,
      is_active: true,
      deactivated_at: null,
    };

    const { data, error } = await service
      .from("org_members")
      .upsert(memberPayload, { onConflict: "org_id,user_id" })
      .select()
      .single();

    if (error) return dbErrorResponse(error);

    return NextResponse.json({
      ...data,
      user_created: !existingProfile,
      user_email: email.trim().toLowerCase(),
      user_name: name?.trim() || existingProfile ? undefined : name?.trim(),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const { id, section_id, section_role, is_org_chief, staff_type, is_active } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing member id" }, { status: 400 });

    const update: Record<string, unknown> = {};
    if (section_id !== undefined) update.section_id = section_id || null;
    if (section_role !== undefined) update.section_role = section_role;
    if (is_org_chief !== undefined) update.is_org_chief = is_org_chief;
    if (staff_type !== undefined) update.staff_type = staff_type;

    if (is_active !== undefined) {
      update.is_active = is_active;
      update.deactivated_at = is_active ? null : new Date().toISOString();
    }

    const { error } = await service.from("org_members").update(update).eq("id", id);
    if (error) return dbErrorResponse(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// PATCH — Reset password for a member
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const { user_id, new_password } = await req.json();
    if (!user_id || !new_password) {
      return NextResponse.json({ error: "Missing user_id or new_password" }, { status: 400 });
    }
    if (new_password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const { error } = await service.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (error) return dbErrorResponse(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
