"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPingByUserId, createPingProfile } from "@/lib/appwrite"; // Import database helpers

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    getCurrentUser()
      .then(async (user) => {
        if (user) {
          try {
            // Check if this logged-in user already has a database profile
            const profile = await getPingByUserId(user.$id);
            
            if (!profile) {
              // If they don't have a profile (new Google/GitHub signup), create a starter one
              const starterHandle = user.email ? user.email.split("@")[0] : `user_${user.$id.slice(0, 8)}`;
              await createPingProfile(user.$id, starterHandle);
            }
          } catch (profileError) {
            console.error("Profile check/creation failed:", profileError);
            // If the error is simply "not found", create it
            try {
              const starterHandle = user.email ? user.email.split("@")[0] : `user_${user.$id.slice(0, 8)}`;
              await createPingProfile(user.$id, starterHandle);
            } catch (createError) {
              console.error("Critical: Failed to auto-create profile", createError);
            }
          }
          
          // Now they have both an Auth account and a Database profile document!
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