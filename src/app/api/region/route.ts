import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUserRegion, getUserRole, REGION_VIEW_COOKIE } from "@/lib/auth-helpers";
import { regionFeatures, resolveRegion, IP_COUNTRY_HEADER, type Region } from "@/lib/region";
import { createServiceClient } from "@/lib/supabase/service";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** Which features the signed-in user's region allows, for the UI to honour. */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const region = await getUserRegion(user.id, req.headers.get(IP_COUNTRY_HEADER));
    const isAdmin = (await getUserRole(user.id)) === "admin";

    // Admins get the extra context needed to switch between both interfaces.
    let ownRegion: Region | null = null;
    let viewing: string | null = null;
    if (isAdmin) {
      const service = createServiceClient();
      const { data } = await service.from("profiles").select("country").eq("id", user.id).maybeSingle();
      ownRegion = resolveRegion(data?.country, req.headers.get(IP_COUNTRY_HEADER));
      viewing = (await cookies()).get(REGION_VIEW_COOKIE)?.value ?? null;
    }

    return NextResponse.json({
      region,
      features: regionFeatures(region),
      isAdmin,
      ...(isAdmin ? { ownRegion, viewing } : {}),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Admin-only: preview the interface of another region (or clear the preview). */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((await getUserRole(user.id)) !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { region } = await req.json();
    const jar = await cookies();

    if (region === "open" || region === "eu" || region === "us") {
      jar.set(REGION_VIEW_COOKIE, region, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 12 * 60 * 60,
      });
      return NextResponse.json({ ok: true, viewing: region });
    }

    jar.delete(REGION_VIEW_COOKIE);
    return NextResponse.json({ ok: true, viewing: null });
  } catch (error) {
    return toErrorResponse(error);
  }
}
