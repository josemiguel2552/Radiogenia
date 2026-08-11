import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRegion } from "@/lib/auth-helpers";
import { regionFeatures, IP_COUNTRY_HEADER } from "@/lib/region";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** Which features the signed-in user's region allows, for the UI to honour. */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const region = await getUserRegion(user.id, req.headers.get(IP_COUNTRY_HEADER));
    return NextResponse.json({ region, features: regionFeatures(region) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
