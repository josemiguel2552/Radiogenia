import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("style_patterns")
      .select("*")
      .eq("user_id", user.id)
      .order("frequency", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Group by modality + study_type
    const groupMap = new Map<string, {
      modality: string;
      study_type: string;
      normal_phrases: typeof data;
      conclusion_phrases: typeof data;
    }>();

    for (const row of data || []) {
      const key = `${row.modality}|${row.study_type}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          modality: row.modality,
          study_type: row.study_type,
          normal_phrases: [],
          conclusion_phrases: [],
        });
      }
      const group = groupMap.get(key)!;
      if (row.kind === "normal_phrase") {
        group.normal_phrases.push(row);
      } else {
        group.conclusion_phrases.push(row);
      }
    }

    return NextResponse.json({ groups: Array.from(groupMap.values()) });
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
    const group = url.searchParams.get("group"); // "modality|study_type"

    if (id) {
      const { error } = await supabase
        .from("style_patterns")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (group) {
      const [modality, studyType] = group.split("|");
      const { error } = await supabase
        .from("style_patterns")
        .delete()
        .eq("user_id", user.id)
        .eq("modality", modality)
        .eq("study_type", studyType);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: "Missing id or group parameter" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
