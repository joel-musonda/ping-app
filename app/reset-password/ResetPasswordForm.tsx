"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { confirmPasswordRecovery } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle2 } from "lucide-react";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");

  // Verify token parameter structures are intact
  useEffect(() => {
    if (!userId || !secret) {
      setError("Invalid or expired password reset credentials tokens.");
    }
  }, [userId, secret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!userId || !secret) return;

    setLoading(true);
    try {
      await confirmPasswordRecovery(userId, secret, password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message ?? "Failed to finalize password reset update.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white text-neutral-900 px-4">
      <div className="w-full max-w-sm p-6 bg-white rounded-xl border border-neutral-200 shadow-sm space-y-5">
        
        <div className="flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-neutral-900" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Set new password</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Must be at least 8 characters long.
          </p>
        </div>

        {success ? (
          <div className="flex items-center gap-2 p-3 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span>Password successfully updated! Moving you to the login screen...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-neutral-700">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white border-neutral-200 text-sm h-9 focus-visible:ring-neutral-400"
                disabled={!userId || !secret}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-neutral-700">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white border-neutral-200 text-sm h-9 focus-visible:ring-neutral-400"
                disabled={!userId || !secret}
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs font-medium bg-red-50 p-2 rounded-md border border-red-100">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || !userId || !secret}
              className="w-full bg-[#0084FF] hover:bg-[#0073e6] active:bg-[#0062c4] text-white font-medium text-sm h-9 shadow-sm transition"
            >
              {loading ? "Resetting password..." : "Confirm New Password"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}