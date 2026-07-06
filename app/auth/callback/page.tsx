"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (user) {
          router.push("/onboarding");
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
      <div className="flex flex-col items-center gap-6">
        {/* Spinner */}
        <div className="w-10 h-10 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />

        <div className="text-center">
          <p className="text-sm font-semibold text-neutral-900">Signing you in</p>
          <p className="text-xs text-neutral-400 mt-1">Just a moment...</p>
        </div>

        {/* Skeleton preview of what's coming next */}
        <div className="w-64 flex flex-col items-center gap-3 mt-2 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-neutral-100" />
          <div className="h-3 bg-neutral-100 rounded w-32" />
          <div className="h-3 bg-neutral-100 rounded w-24" />
        </div>
      </div>
    </main>
  );
}