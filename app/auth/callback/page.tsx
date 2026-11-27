"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeOAuthSignIn, getCurrentUser, getPostAuthDestination, AuthFlowError } from "@/lib/auth";

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");
    window.history.replaceState(null, "", "/auth/callback");

    (async () => {
      try {
        await completeOAuthSignIn(userId, secret);
        const user = await getCurrentUser();
        if (!user) throw new AuthFlowError("oauth_failed");
        router.replace(await getPostAuthDestination(user));
      } catch (err) {
        console.error("OAuth callback failed:", err);
        const reason = err instanceof AuthFlowError ? err.reason : "oauth_failed";
        router.replace(`/login?error=${reason}`);
      }
    })();
  }, [router, searchParams]);

  return (
    <main className="flex flex-col items-center justify-center min-h-[100dvh] bg-white px-4">
      <div className="flex flex-col items-center gap-6">
        <div className="w-10 h-10 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-sm font-semibold text-neutral-900">Signing you in</p>
          <p className="text-xs text-neutral-400 mt-1">Just a moment...</p>
        </div>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallback />
    </Suspense>
  );
}
