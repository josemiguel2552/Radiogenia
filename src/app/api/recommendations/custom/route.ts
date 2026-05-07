import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("user_recommendations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ recommendations: [] });

    const recommendations = (data || []).map((row) => ({
      id: row.id,
      category: row.category,
      modality: row.modality,
      title: { es: row.title, en: row.title, pt: row.title },
      text: { es: row.text, en: row.text, pt: row.text },
      tags: row.tags || [],
      source: row.overrides ? "Personal (mod.)" : "Personal",
      scope: "user" as const,
      ...(row.overrides ? { overrides: row.overrides } : {}),
    }));

    return NextResponse.json({ recommendations });
  } catch {
    return NextResponse.json({ recommendations: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { category, modality, title, text, tags, overrides } = await req.json();
    if (!title || !text) {
      return NextResponse.json({ error: "title and text required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_recommendations")
      .insert({
        user_id: user.id,
        category: category || "all",
        modality: modality || "all",
        title,
        text,
        tags: tags || [],
        ...(overrides ? { overrides } : {}),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: data.id });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, category, modality, title, text, tags } = await req.json();
    if (!id || !title || !text) {
      return NextResponse.json({ error: "id, title and text required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_recommendations")
      .update({ category: category || "all", modality: modality || "all", title, text, tags: tags || [] })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await supabase
      .from("user_recommendations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
