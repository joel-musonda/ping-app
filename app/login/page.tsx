"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithGoogle,
  sendEmailOtp,
  verifyEmailOtp,
  getCurrentUser,
  getPostAuthDestination,
  describeAuthError,
} from "@/lib/auth";
import { Button } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_CODE_ATTEMPTS = 5;

const CALLBACK_ERRORS: Record<string, string> = {
  oauth_failed: "Google sign-in was cancelled or failed. Please try again.",
  oauth_state: "That sign-in link has expired or was not started from this browser. Please try again.",
};

const inputClass =
  "w-full h-11 px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 bg-white border border-neutral-200 rounded-xl outline-none hover:border-neutral-300 focus:border-[#3892D0] focus:ring-2 focus:ring-[#3892D0]/30 transition-all";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpUserId, setOtpUserId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState(() => {
    const reason = searchParams.get("error");
    return reason ? CALLBACK_ERRORS[reason] ?? CALLBACK_ERRORS.oauth_failed : "";
  });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState<"email" | "code" | "google" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getCurrentUser();
      if (user && !cancelled) router.replace(await getPostAuthDestination(user));
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    setError("");
    setNotice("");
    setLoading("email");
    try {
      const userId = await sendEmailOtp(email);
      setOtpUserId(userId);
      setCode("");
      setAttempts(0);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice(`We sent a 6-digit code to ${email.trim().toLowerCase()}.`);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setLoading(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || cooldown > 0) return;
    await sendCode();
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpUserId || loading) return;
    setError("");
    setLoading("code");
    try {
      await verifyEmailOtp(otpUserId, code);
      const user = await getCurrentUser();
      if (!user) throw new Error("Session was not created");
      router.replace(await getPostAuthDestination(user));
    } catch (err) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_CODE_ATTEMPTS) {
        setOtpUserId(null);
        setNotice("");
        setError("Too many incorrect attempts. Request a new code to continue.");
      } else {
        setError(describeAuthError(err));
      }
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading("google");
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(describeAuthError(err));
      setLoading(null);
    }
  };

  const resetEmail = () => {
    setOtpUserId(null);
    setCode("");
    setNotice("");
    setError("");
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-[100dvh] w-full bg-slate-50/50 text-neutral-900 p-4 sm:p-6">
      <div className="w-full max-w-sm p-6 sm:p-8 bg-white rounded-2xl border border-neutral-200/80 shadow-2xl shadow-neutral-200/70 my-auto">
        <div className="flex flex-col items-center mb-6 text-center">
          <Link href="/" className="mb-4 transition-transform hover:scale-105">
            <Image src="/logo.png" alt="Ping Logo" width={72} height={72} className="object-contain" priority />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            {otpUserId ? "Check your email" : "Welcome to Ping"}
          </h1>
          <p className="text-xs text-neutral-500 mt-1.5">
            {otpUserId
              ? "Enter the code we emailed you. It expires in 15 minutes."
              : "Sign in or create an account. No password needed."}
          </p>
        </div>

        {!otpUserId ? (
          <div className="flex flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              isPending={loading === "google"}
              isDisabled={loading !== null}
              className="w-full flex items-center justify-center gap-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-sm h-11 rounded-xl shadow-sm"
            >
              <Image src="/google.png" alt="" width={16} height={16} />
              Continue with Google
            </Button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-neutral-200"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase text-neutral-400 font-bold tracking-wider">or</span>
              <div className="flex-grow border-t border-neutral-200"></div>
            </div>

            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-neutral-700">Email</label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="johndoe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              {error && <ErrorBanner message={error} />}

              <Button
                type="submit"
                isPending={loading === "email"}
                isDisabled={loading !== null || cooldown > 0}
                className="w-full bg-[#3892D0] hover:bg-[#2b7bb5] active:bg-[#226697] text-white font-semibold shadow-sm text-sm h-11 rounded-xl transition-all"
              >
                {loading === "email" ? "Sending code..." : cooldown > 0 ? `Send code again in ${cooldown}s` : "Continue with email"}
              </Button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
            {notice && <p className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-200/80 break-words">{notice}</p>}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="code" className="text-xs font-semibold text-neutral-700">Verification code</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                autoFocus
                className={`${inputClass} text-center tracking-[0.5em] font-semibold`}
              />
            </div>

            {error && <ErrorBanner message={error} />}

            <Button
              type="submit"
              isPending={loading === "code"}
              isDisabled={loading !== null || code.length !== 6}
              className="w-full bg-[#3892D0] hover:bg-[#2b7bb5] active:bg-[#226697] text-white font-semibold shadow-sm text-sm h-11 rounded-xl transition-all"
            >
              {loading === "code" ? "Verifying..." : "Verify and continue"}
            </Button>

            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={resetEmail} className="font-semibold text-neutral-500 hover:text-neutral-900 transition-colors">
                Use a different email
              </button>
              <button
                type="button"
                onClick={sendCode}
                disabled={loading !== null || cooldown > 0}
                className="font-semibold text-neutral-500 hover:text-neutral-900 disabled:text-neutral-300 transition-colors"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-[11px] text-neutral-400 mt-6 leading-relaxed">
          New to Ping? An account is created automatically the first time you sign in.
        </p>
      </div>
    </main>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="text-red-600 text-xs font-medium bg-red-50/80 p-3 rounded-xl border border-red-200/60 leading-relaxed">
      {message}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}
