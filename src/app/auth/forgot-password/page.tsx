"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Loader2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              Radiogen<span className="text-gray-500">.ai</span>
            </span>
          </div>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Check your email</h1>
            <p className="text-sm text-gray-400">
              We sent a password reset link to <span className="text-white font-medium">{email}</span>.
              Click the link in the email to set a new password.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Reset your password</h1>
              <p className="text-sm text-gray-400">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300 text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 font-semibold shadow-lg shadow-purple-500/20"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
              </Button>
            </form>

            <p className="text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
