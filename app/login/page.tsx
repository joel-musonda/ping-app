"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { logIn, signInWithGoogle, signInWithGithub } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
    <main className="flex flex-col items-center justify-center min-h-screen bg-white text-neutral-900 px-4">
      <div className="w-full max-w-sm p-6 bg-white rounded-xl border border-neutral-200 shadow-sm">

        <div className="flex flex-col items-center mb-6 text-center">
          <div className="mb-4">
            <Image
              src="/logo.png"
              alt="Ping Logo"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Log in to your account</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Welcome back! Please enter your details.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-neutral-700 font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white border-neutral-300 text-neutral-900 focus-visible:ring-neutral-400"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-neutral-700 font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white border-neutral-300 text-neutral-900 focus-visible:ring-neutral-400"
              required
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-neutral-600 select-none">
              <Checkbox className="border-neutral-300 data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900" />
              Remember for 30 days
            </label>
            <a href="/forgot-password" className="text-xs font-semibold text-neutral-400 hover:text-neutral-950 transition ml-auto">
              Forgot password?
            </a>
          </div>

          {error && (
            <p className="text-red-500 text-xs font-medium bg-red-50 p-2 rounded-md border border-red-100">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium shadow-sm transition-colors mt-2"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-neutral-200"></div>
            <span className="flex-shrink mx-4 text-xs uppercase text-neutral-400 font-semibold tracking-wider">or continue with</span>
            <div className="flex-grow border-t border-neutral-200"></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => signInWithGoogle()}
              className="flex items-center justify-center gap-2 border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-medium shadow-sm"
            >
              <Image src="/google.png" alt="Google" width={16} height={16} />
              Google
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => signInWithGithub()}
              className="flex items-center justify-center gap-2 border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-medium shadow-sm"
            >
              <Image src="/github.png" alt="GitHub" width={16} height={16} />
              GitHub
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-6">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-neutral-900 font-semibold hover:underline">
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