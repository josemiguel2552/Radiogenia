import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getDefaultPhrase } from "@/lib/normality-defaults";
import { getOrgMembership } from "@/lib/auth-helpers";

function extractSectionLabels(templateText: string): string[] {
  const re = /\*{2,3}([^*]+)\*{2,3}/g;
  const labels: string[] = [];
  let m;
  while ((m = re.exec(templateText)) !== null) {
    const label = m[1].trim();
    if (label.length > 1) labels.push(label);
  }
  return labels;
}

async function syncNormalityPhrases(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  modality: string,
  templateText: string,
) {
  const labels = extractSectionLabels(templateText);
  if (labels.length === 0) return;

  for (const label of labels) {
    const defaultPhrase = getDefaultPhrase(modality, label);
    await supabase
      .from("normality_phrases")
      .upsert(
        {
          user_id: userId,
          modality,
          section_label: label,
          phrase: defaultPhrase,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,modality,section_label", ignoreDuplicates: true }
      );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [globalRes, userRes, hiddenRes] = await Promise.all([
      supabase.from("global_templates").select("*").eq("is_active", true).order("name"),
      supabase.from("user_templates").select("*").eq("user_id", user.id).order("name"),
      supabase.from("user_hidden_templates").select("global_template_id").eq("user_id", user.id),
    ]);

    const hiddenIds = new Set((hiddenRes.data || []).map((h: { global_template_id: string }) => h.global_template_id));

    const globals = (globalRes.data || [])
      .filter((g) => !hiddenIds.has(g.id))
      .map((g) => ({
        id: g.id,
        user_id: user.id,
        name: g.name,
        modality: g.modality,
        base_template_id: g.base_template_id,
        structure: g.structure,
        is_default: true,
        is_global: true,
        created_at: g.created_at,
      }));

    const customs = (userRes.data || []).map((u) => ({
      ...u,
      is_default: false,
      is_global: false,
    }));

    // Merge only imported org templates
    let orgTemplates: typeof globals = [];
    try {
      const membership = await getOrgMembership(user.id);
      if (membership) {
        const service = createServiceClient();
        const { data: imports } = await service
          .from("user_template_imports")
          .select("org_template_id")
          .eq("user_id", user.id);

        const importedIds = (imports || []).map((r: { org_template_id: string }) => r.org_template_id);

        if (importedIds.length > 0) {
          const { data: orgData } = await supabase
            .from("org_templates")
            .select("*, org_sections(name)")
            .eq("org_id", membership.org_id)
            .in("id", importedIds)
            .order("name");

          orgTemplates = (orgData || []).map((t) => {
            const sec = t.org_sections as unknown as { name: string } | null;
            return {
              id: t.id,
              user_id: user.id,
              name: t.name,
              modality: t.modality,
              base_template_id: t.base_template_id,
              structure: t.structure,
              is_default: true,
              is_global: false,
              is_org: true,
              section_name: sec?.name || "",
              created_at: t.created_at,
            };
          });
        }
      }
    } catch { /* org tables may not exist */ }

    return NextResponse.json([...globals, ...orgTemplates, ...customs]);
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

    const body = await req.json();
    const insertPayload = {
      user_id: user.id,
      name: body.name || "",
      modality: body.modality || "",
      base_template_id: body.base_template_id ?? null,
      structure: body.structure || {},
      is_default: false,
    };

    const { data, error } = await supabase.from("user_templates").insert(insertPayload).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const templateText = body.structure?.template || "";
    const modality = body.modality || "";
    if (templateText && modality) {
      try {
        await syncNormalityPhrases(supabase, user.id, modality, templateText);
      } catch { /* non-critical */ }
    }

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

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const updatePayload: Record<string, unknown> = {};
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.modality !== undefined) updatePayload.modality = body.modality;
    if (body.structure !== undefined) updatePayload.structure = body.structure;
    if (body.base_template_id !== undefined) updatePayload.base_template_id = body.base_template_id;

    const { data, error } = await supabase
      .from("user_templates")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const templateText = body.structure?.template || "";
    const modality = body.modality || data?.modality || "";
    if (templateText && modality) {
      try {
        await syncNormalityPhrases(supabase, user.id, modality, templateText);
      } catch { /* non-critical */ }
    }

    return NextResponse.json(data);
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
    const isGlobal = url.searchParams.get("global") === "true";
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    if (isGlobal) {
      const { error } = await supabase
        .from("user_hidden_templates")
        .upsert(
          { user_id: user.id, global_template_id: id },
          { onConflict: "user_id,global_template_id", ignoreDuplicates: true },
        );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase
        .from("user_templates")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
