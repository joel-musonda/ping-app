"use client";

import { useState } from "react";
import { sendPasswordRecovery } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await sendPasswordRecovery(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? "Failed to send verification link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white text-neutral-900 px-4">
      <div className="w-full max-w-sm p-6 bg-white rounded-xl border border-neutral-200 shadow-sm space-y-5">
        
        {/* Header Stack */}
        <div className="flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
            <KeyRound className="w-5 h-5 text-neutral-900" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Forgot password?</h1>
          <p className="text-xs text-neutral-500 mt-1">
            No worries, we'll send you recovery optimization instructions.
          </p>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="flex items-center gap-2 p-3 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-lg text-left">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span>Reset authorization link sent! Please check your email inbox to update your security keys.</span>
            </div>
            <a 
              href="/login" 
              className="inline-flex items-center justify-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-neutral-700">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white border-neutral-200 text-sm h-9 focus-visible:ring-neutral-400"
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
              disabled={loading}
              className="w-full bg-[#0084FF] hover:bg-[#0073e6] active:bg-[#0062c4] text-white font-medium text-sm h-9 shadow-sm transition"
            >
              {loading ? "Sending link..." : "Reset Password"}
            </Button>

            <div className="text-center pt-1">
              <a 
                href="/login" 
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 font-semibold transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </a>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}