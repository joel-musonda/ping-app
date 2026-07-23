"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, signInWithGoogle, signInWithGithub, sendEmailVerification } from "@/lib/auth";
import { Button } from "@heroui/react";
import Image from "next/image";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Registers standard auth account in Appwrite
      await signUp(email, password);

      try {
        await sendEmailVerification();
      } catch (err) {
        console.error("Failed to send verification email:", err);
      }

      router.push("/onboarding");
    } catch (err: any) {
      console.error("Signup failed:", err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-[100dvh] w-full bg-slate-50/50 text-neutral-900 p-4 sm:p-6">
      {/* Container card */}
      <div className="w-full max-w-sm p-6 sm:p-8 bg-white rounded-2xl border border-neutral-200/80 shadow-2xl shadow-neutral-200/70 my-auto">
        
        {/* Top Logo Section */}
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Create your account
          </h1>
          <p className="text-xs text-neutral-500 mt-1.5">
            Bold ideas change the world. Share yours on Ping
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
              placeholder="johndoe@example.com"
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

          {/* Error Banner */}
          {error && (
            <div className="text-red-600 text-xs font-medium bg-red-50/80 p-3 rounded-xl border border-red-200/60 leading-relaxed">
              {error}
            </div>
          )}

          {/* Primary Submit Button (Columbia Blue Theme) */}
          <Button
            type="submit"
            isPending={loading}
            className="w-full bg-[#3892D0] hover:bg-[#2b7bb5] active:bg-[#226697] text-white font-semibold shadow-sm text-sm h-11 rounded-xl transition-all mt-1"
          >
            {loading ? "Signing up..." : "Sign up"}
          </Button>

          {/* Social Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-neutral-200"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase text-neutral-400 font-bold tracking-wider">
              or continue with
            </span>
            <div className="flex-grow border-t border-neutral-200"></div>
          </div>

          {/* Social Sign Up Options */}
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => signInWithGoogle()}
              className="flex items-center justify-center gap-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-xs h-10 rounded-xl shadow-sm"
            >
              <Image 
                src="/google.png" 
                alt="Google"
                width={16}
                height={16}
              />
              Google
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => signInWithGithub()}
              className="flex items-center justify-center gap-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-xs h-10 rounded-xl shadow-sm"
            >
              <Image 
                src="/github.png" 
                alt="GitHub"
                width={16}
                height={16}
              />
              GitHub
            </Button>
          </div>
        </form>

        {/* Footer Link */}
        <p className="text-center text-xs text-neutral-500 mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-neutral-900 font-bold hover:underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}