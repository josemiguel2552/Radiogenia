import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api-error";

import { GET as consentGET } from "../consent/route";
import { GET as regionGET } from "../region/route";
import { GET as modelConfigGET } from "../model-config/route";
import { GET as signaturesGET } from "../signatures/route";
import { GET as subscriptionGET } from "../subscription/route";
import { GET as templatesGET } from "../templates/route";
import { GET as reportsGET } from "../reports/route";

export const dynamic = "force-dynamic";

/**
 * Everything the dashboard needs to start, in one round trip.
 *
 * Opening the dashboard used to fire seven independent requests — consent,
 * region, templates, model config, subscription, signatures and the report
 * count — and each one re-validated the session against the Supabase auth
 * server before it could begin. On a desk next to the datacentre that is
 * invisible. On a hospital connection from Latin America it is seven times
 * the round trip to first usable screen, and it is why the app felt slow
 * however small the bundle got.
 *
 * The fix is not new logic: it is calling the SAME route handlers, here, in
 * parallel, inside one request. Seven client round trips become one, and the
 * seven auth checks that remain run server-to-server, where latency is a few
 * milliseconds. Reusing the handlers rather than reimplementing their queries
 * is deliberate — a second copy of the subscription rules is a copy that will
 * be corrected in one place and not the other.
 *
 * Every section is independent: one failing returns null for that key and
 * leaves the rest intact, and the client falls back to the individual
 * endpoint for whatever is missing. A slow or broken bootstrap can therefore
 * never be worse than the sequence it replaces.
 */

/** Runs one handler and reads its JSON, or returns null rather than failing the batch. */
async function section<T>(run: () => Promise<Response>): Promise<T | null> {
  try {
    const res = await run();
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    // The report count is only used to decide whether this is a first-ever
    // report, so it asks for the count alone rather than the reports.
    const countUrl = new URL(req.url);
    countUrl.searchParams.set("count_only", "1");
    const countReq = new NextRequest(countUrl, { headers: req.headers });

    const [consent, region, config, signatures, subscription, templates, reports] = await Promise.all([
      section(() => consentGET()),
      section(() => regionGET(req)),
      section(() => modelConfigGET()),
      section(() => signaturesGET()),
      section(() => subscriptionGET()),
      section(() => templatesGET()),
      section(() => reportsGET(countReq)),
    ]);

    return NextResponse.json({ consent, region, config, signatures, subscription, templates, reports });
  } catch (error) {
    return toErrorResponse(error);
  }
}
