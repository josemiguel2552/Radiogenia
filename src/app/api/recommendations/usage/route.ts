import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("recommendation_usage")
      .select("recommendation_id, usage_count")
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ usage: [] });

    return NextResponse.json({ usage: data || [] });
  } catch {
    return NextResponse.json({ usage: [] });
  }
}
