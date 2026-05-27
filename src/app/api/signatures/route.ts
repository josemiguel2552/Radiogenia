import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

const TABLE_SQL = `create table if not exists public.signatures (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  label text not null,
  body text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists signatures_user_idx on public.signatures (user_id);
alter table public.signatures enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'signatures' and policyname = 'users manage own signatures'
  ) then
    create policy "users manage own signatures"
      on public.signatures for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;`;

let tableReady = false;

async function tryCreateTable(): Promise<boolean> {
  const service = createServiceClient();

  // Quick check: if table already exists, we're done
  const { error: probe } = await service.from("signatures").select("id").limit(0);
  if (!probe) return true;
  if (!probe.message?.includes("does not exist")) return true;

  // Attempt 1: exec_sql RPC (works if the function was installed)
  const { error: rpcErr } = await service.rpc("exec_sql", { sql: TABLE_SQL });
  if (!rpcErr) {
    const { error: verify } = await service.from("signatures").select("id").limit(0);
    if (!verify) return true;
  }

  // Attempt 2: direct SQL endpoint (some Supabase setups expose this)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (url && key) {
    try {
      const res = await fetch(`${url}/pg/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ query: TABLE_SQL }),
      });
      if (res.ok) {
        const { error: verify } = await service.from("signatures").select("id").limit(0);
        if (!verify) return true;
      }
    } catch {
      // endpoint not available
    }
  }

  console.error(
    "[signatures] Could not auto-create signatures table. Run migration 015_signatures.sql in your Supabase SQL Editor."
  );
  return false;
}

function isTableMissing(errorMsg?: string): boolean {
  return !!errorMsg && (errorMsg.includes("does not exist") || errorMsg.includes("signatures"));
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!tableReady) {
    tableReady = await tryCreateTable();
  }

  const result = await supabase
    .from("signatures")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (result.error) {
    if (isTableMissing(result.error.message)) {
      return NextResponse.json({ error: "SETUP_REQUIRED" }, { status: 503 });
    }
    return dbErrorResponse(result.error);
  }
  return NextResponse.json(result.data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label, body } = await req.json();
  if (!label?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Label and body are required" }, { status: 400 });
  }

  if (!tableReady) {
    tableReady = await tryCreateTable();
  }

  const { data, error } = await supabase
    .from("signatures")
    .insert({ user_id: user.id, label: label.trim(), body: body.trim(), is_active: false })
    .select()
    .single();

  if (error) {
    if (isTableMissing(error.message)) {
      return NextResponse.json({ error: "SETUP_REQUIRED" }, { status: 503 });
    }
    return dbErrorResponse(error);
  }
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, label, body, is_active } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (is_active === true) {
    await supabase
      .from("signatures")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .neq("id", id);
  }

  const updates: Record<string, unknown> = {};
  if (label !== undefined) updates.label = label.trim();
  if (body !== undefined) updates.body = body.trim();
  if (is_active !== undefined) updates.is_active = is_active;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("signatures")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    if (isTableMissing(error.message)) {
      return NextResponse.json({ error: "SETUP_REQUIRED" }, { status: 503 });
    }
    return dbErrorResponse(error);
  }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("signatures")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (isTableMissing(error.message)) {
      return NextResponse.json({ error: "SETUP_REQUIRED" }, { status: 503 });
    }
    return dbErrorResponse(error);
  }
  return NextResponse.json({ ok: true });
}
