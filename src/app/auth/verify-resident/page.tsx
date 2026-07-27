"use client";

/* The resident plan was retired from the offer (card-first billing).
   Legacy links land on the normal activation flow instead. */

import { useEffect } from "react";

export default function VerifyResidentPage() {
  useEffect(() => {
    window.location.replace("/auth/pending-payment?plan=starter");
  }, []);
  return <div className="min-h-screen bg-[#0a0a1a]" />;
}
