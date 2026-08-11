import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/landing-page";
import { resolveRegion, IP_COUNTRY_HEADER } from "@/lib/region";

export default async function HomePage() {
  // Only hit Supabase when an auth cookie exists — anonymous visitors (the
  // common case for the landing page) render immediately with no network call.
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (hasAuthCookie) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  // Anonymous visitors have no account yet, so the connection country is all
  // we have: EU/US visitors must not be shown features they would not receive.
  const h = await headers();
  const region = resolveRegion(null, h.get(IP_COUNTRY_HEADER));

  return <LandingPage region={region} />;
}
