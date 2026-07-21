"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { logIn, signInWithGoogle, signInWithGithub } from "@/lib/auth";
import { Button, Checkbox } from "@heroui/react";
import Image from "next/image";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      try {
        const parsed = JSON.parse(errorParam);
        if (parsed.type === "user_already_exists") {
          setError(
            "An account with this email already exists. Try logging in with your email and password instead."
          );
        } else {
          setError(parsed.message || "Something went wrong signing in.");
        }
      } catch {
        setError("Something went wrong signing in.");
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await logIn(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-slate-50/50 text-neutral-900 px-4">
      {/* Container card */}
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl border border-neutral-200/80 shadow-2xl shadow-neutral-200/70">

        {/* Header Section */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="mb-4 transition-transform hover:scale-105">
            <Image
              src="/logo.png"
              alt="Ping Logo"
              width={72}
              height={72}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Log in to your account
          </h1>
          <p className="text-xs text-neutral-500 mt-1.5">
            Welcome back! Please enter your details.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-neutral-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 bg-white border border-neutral-200 rounded-xl outline-none hover:border-neutral-300 focus:border-[#3892D0] focus:ring-2 focus:ring-[#3892D0]/30 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-neutral-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-11 px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 bg-white border border-neutral-200 rounded-xl outline-none hover:border-neutral-300 focus:border-[#3892D0] focus:ring-2 focus:ring-[#3892D0]/30 transition-all"
            />
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-1">
            <Checkbox
             
              className="text-xs text-neutral-600 font-medium select-none"
            >
              Remember for 30 days
            </Checkbox>
            <a
              href="/forgot-password"
              className="font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Forgot password?
            </a>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="text-red-600 text-xs font-medium bg-red-50/80 p-3 rounded-xl border border-red-200/60 leading-relaxed">
              {error}
            </div>
          )}

          {/* Primary Submit Button */}
          <Button
            type="submit"
            isPending={loading}
            className="w-full bg-[#3892D0] hover:bg-[#2b7bb5] active:bg-[#226697] text-white font-semibold shadow-sm text-sm h-11 rounded-xl transition-all mt-1"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-neutral-200"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase text-neutral-400 font-bold tracking-wider">
              or continue with
            </span>
            <div className="flex-grow border-t border-neutral-200"></div>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => signInWithGoogle()}
              className="flex items-center justify-center gap-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-xs h-10 rounded-xl shadow-sm"
            >
              <Image src="/google.png" alt="Google" width={16} height={16} />
              Google
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => signInWithGithub()}
              className="flex items-center justify-center gap-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-xs h-10 rounded-xl shadow-sm"
            >
              <Image src="/github.png" alt="GitHub" width={16} height={16} />
              GitHub
            </Button>
          </div>
        </form>

        {/* Footer Link */}
        <p className="text-center text-xs text-neutral-500 mt-6">
          Don&apos;t have an account?{" "}
          <a
            href="/signup"
            className="text-neutral-900 font-bold hover:underline"
          >
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}