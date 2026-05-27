import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgMembership } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return dbErrorResponse(error);
    return NextResponse.json(data || []);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subject, body, category } = await req.json();
    if (!body) return NextResponse.json({ error: "Message body is required" }, { status: 400 });

    const membership = await getOrgMembership(user.id);

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        org_id: membership?.org_id || null,
        user_id: user.id,
        subject: subject || "",
        body,
        category: category || "general",
      })
      .select()
      .single();

    if (error) return dbErrorResponse(error);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
