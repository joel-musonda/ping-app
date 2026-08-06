"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPingByUserId, createPingProfile } from "@/lib/appwrite"; 

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const handleAuthCallback = async () => {
      try {
        // Add a small initial delay to allow Appwrite session cookies/tokens to settle across redirects
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        const user = await getCurrentUser();

        if (!isMounted) return;

        if (user && user.$id) {
          let profile = null;
          let retries = 3;

          // Retry logic to handle race conditions where Appwrite auth is created 
          // but the session or database read has a slight propagation latency
          while (retries > 0 && !profile) {
            try {
              profile = await getPingByUserId(user.$id);
            } catch (err) {
              console.warn(`Profile fetch attempt failed (${retries} retries left):`, err);
            }
            if (!profile && retries > 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
            retries--;
          }

          if (!profile) {
            // If they still don't have a profile document, create it now safely
            const starterHandle = user.email ? user.email.split("@")[0] : `user_${user.$id.slice(0, 8)}`;
            try {
              await createPingProfile(user.$id, starterHandle);
            } catch (createError) {
              console.error("Critical: Failed to auto-create profile during callback", createError);
            }
          }

          if (!isMounted) return;
          // Ensure redirection targets the onboarding flow reliably
          router.replace("/onboarding");
        } else {
          if (!isMounted) return;
          router.replace("/login");
        }
      } catch (err) {
        console.error("Auth callback processing failed:", err);
        if (isMounted) {
          router.replace("/login");
        }
      }
    };

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
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