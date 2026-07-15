"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmEmailVerification, getCurrentUser } from "@/lib/auth";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Use a ref to strictly prevent dual-execution during React double-renders
  const verificationAttempted = useRef(false);

  useEffect(() => {
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    if (!userId || !secret) {
      setStatus("error");
      setErrorMessage("Missing verification parameters in the URL.");
      return;
    }

    async function performVerification() {
      if (verificationAttempted.current) return;
      verificationAttempted.current = true;

      try {
        // 1. Check if the user is already verified before we touch the token
        const currentUser = await getCurrentUser();
        if (currentUser?.emailVerification) {
          setStatus("success");
          setTimeout(() => router.push("/onboarding"), 2000);
          return;
        }

        // 2. Run the verification update
        await confirmEmailVerification(userId!, secret!);
        setStatus("success");
        
        // Redirect to onboarding after a brief success message display
        setTimeout(() => router.push("/onboarding"), 2000);
      } catch (err: any) {
        console.error("Verification error caught:", err);

        // 3. Fallback: Double check if they are actually verified now
        // This rescues the user if a double-mount consumed the single-use token!
        const verifyUserCheck = await getCurrentUser();
        if (verifyUserCheck?.emailVerification) {
          setStatus("success");
          setTimeout(() => router.push("/onboarding"), 2000);
        } else {
          setStatus("error");
          setErrorMessage(err?.message || "The verification link is invalid or has expired.");
        }
      }
    }

    performVerification();
  }, [searchParams, router]);

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 md:p-8 text-center space-y-6">
        {status === "verifying" && (
          <div className="space-y-4">
            <Loader2 className="w-10 h-10 text-neutral-900 animate-spin mx-auto" />
            <h1 className="text-lg font-bold text-neutral-900">Confirming your email...</h1>
            <p className="text-sm text-neutral-500">Securing your account details. Please hold on.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold text-neutral-900">Email Verified!</h1>
            <p className="text-sm text-neutral-500">Your account is ready. Redirecting you to onboarding...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold text-neutral-900">Verification Link Expired</h1>
            <p className="text-sm text-neutral-500">{errorMessage}</p>
            <div className="pt-2">
              <Button 
                onClick={() => router.push("/onboarding")} 
                className="w-full bg-neutral-900 text-white hover:bg-neutral-800"
              >
                Go to Onboarding / Resend Email
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}