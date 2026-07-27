import { NextResponse } from "next/server";

/* Card-first billing: the referral program (30 days of Starter without a
   card) was retired — nobody gets access without registering a card first.
   Invite links now funnel into the normal 7-day-trial signup; this endpoint
   stays only so old clients get a clear error instead of a crash. */

export async function POST() {
  return NextResponse.json({ error: "invite_program_ended" }, { status: 410 });
}
