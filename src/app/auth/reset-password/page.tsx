"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Loader2, Check, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // User arrived via reset link — session is set
      }
    });
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    }
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

        {success ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Password updated</h1>
            <p className="text-sm text-gray-400">Redirecting you to the dashboard...</p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Set new password</h1>
              <p className="text-sm text-gray-400">Choose a strong password for your account.</p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300 text-sm">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-gray-300 text-sm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
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
