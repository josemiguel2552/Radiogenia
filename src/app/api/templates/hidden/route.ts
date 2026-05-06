import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: hidden } = await supabase
      .from("user_hidden_templates")
      .select("global_template_id")
      .eq("user_id", user.id);

    const hiddenIds = (hidden || []).map((h: { global_template_id: string }) => h.global_template_id);
    if (hiddenIds.length === 0) return NextResponse.json([]);

    const { data: templates } = await supabase
      .from("global_templates")
      .select("id, name, modality")
      .in("id", hiddenIds)
      .order("name");

    return NextResponse.json(templates || []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await supabase
      .from("user_hidden_templates")
      .delete()
      .eq("user_id", user.id)
      .eq("global_template_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
