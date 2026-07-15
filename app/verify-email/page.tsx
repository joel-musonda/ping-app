"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmEmailVerification, getCurrentUser } from "@/lib/auth";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// 1. Move the hook and verification logic into an inner component
function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  
  // A ref flag is highly reliable for blocking React StrictMode double-triggers
  const verificationAttempted = useRef(false);

  useEffect(() => {
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    if (!userId || !secret) {
      setStatus("error");
      setErrorMessage("Missing verification parameters in URL.");
      return;
    }

    async function performVerification() {
      // If we have already started verifying in this mount session, exit immediately
      if (verificationAttempted.current) return;
      verificationAttempted.current = true;

      try {
        // 1. First, check if the user is already verified (bypasses expired token errors entirely)
        const currentUser = await getCurrentUser();
        if (currentUser?.emailVerification) {
          setStatus("success");
          setTimeout(() => router.push("/onboarding"), 1500);
          return;
        }

        // 2. If not verified yet, attempt to confirm the token
        await confirmEmailVerification(userId!, secret!);
        setStatus("success");
        setTimeout(() => router.push("/onboarding"), 1500);
      } catch (err: any) {
        console.error("Verification error caught:", err);

        // 3. Fallback check: If the token failed, verify if they actually succeeded in the background
        const verifyUserCheck = await getCurrentUser();
        if (verifyUserCheck?.emailVerification) {
          setStatus("success");
          setTimeout(() => router.push("/onboarding"), 1500);
        } else {
          setStatus("error");
          setErrorMessage(err?.message || "The verification link is invalid, has expired, or was already used.");
        }
      }
    }

    performVerification();
  }, [searchParams, router]);

  return (
    <div className="max-w-md w-full bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 md:p-8 text-center space-y-6">
      {status === "verifying" && (
        <div className="space-y-4">
          <Loader2 className="w-10 h-10 text-neutral-900 animate-spin mx-auto" />
          <h1 className="text-lg font-bold text-neutral-900">Verifying your email...</h1>
          <p className="text-sm text-neutral-500">Connecting to secure credentials workspace...</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <h1 className="text-xl font-bold text-neutral-900">Email Verified!</h1>
          <p className="text-sm text-neutral-500">Heading to your onboarding workspace...</p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-neutral-900">Verification Failed</h1>
          <p className="text-sm text-neutral-500">{errorMessage}</p>
          <div className="pt-2">
            <Button 
              onClick={() => router.push("/onboarding")} 
              className="w-full bg-neutral-900 text-white hover:bg-neutral-800 h-10"
            >
              Go to Onboarding / Request New Code
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// 2. Use a default export wrapped in <Suspense> to make the build compile smoothly
export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="max-w-md w-full bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 md:p-8 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-neutral-900 animate-spin mx-auto" />
          <h1 className="text-lg font-bold text-neutral-900">Loading verification stream...</h1>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}