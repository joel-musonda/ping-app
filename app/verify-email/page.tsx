"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmEmailVerification } from "@/lib/auth";
import { Check, X } from "lucide-react";

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  useEffect(() => {
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    if (!userId || !secret) {
      setStatus("error");
      return;
    }

    confirmEmailVerification(userId, secret)
      .then(() => {
        setStatus("success");
        setTimeout(() => router.push("/onboarding"), 1500);
      })
      .catch((err) => {
        console.error("Email verification failed:", err);
        setStatus("error");
      });
  }, [searchParams, router]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        {status === "verifying" && (
          <>
            <div className="w-10 h-10 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
            <p className="text-sm font-semibold text-neutral-900">Verifying your email...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-neutral-900">Email verified!</p>
            <p className="text-xs text-neutral-400">Taking you to finish setting up your profile...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <X className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-sm font-semibold text-neutral-900">Verification link invalid or expired</p>
            <p className="text-xs text-neutral-400">
              Go back to onboarding to request a new verification email.
            </p>
            <button
              onClick={() => router.push("/onboarding")}
              className="mt-2 text-sm font-medium text-neutral-900 underline"
            >
              Back to onboarding
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}