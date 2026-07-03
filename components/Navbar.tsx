"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, logOut } from "@/lib/auth";
import { getPingByUserId } from "@/lib/appwrite";
import { useRouter, usePathname } from "next/navigation"; // <-- Added usePathname here

export default function Navbar() {
  const [handle, setHandle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); // <-- Read the current URL route path

  useEffect(() => {
    getCurrentUser()
      .then(async (user) => {
        if (!user) {
          setHandle(null);
          return;
        }
        const ping = await getPingByUserId(user.$id);
        setHandle(ping?.handle ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logOut();
    setHandle(null);
    router.push("/");
    router.refresh();
  };

  // If the user is viewing the login page or signup page, completely hide the navbar
  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <nav className="flex items-center justify-between p-4 border-b bg-white">
      <a href="/" className="font-bold text-lg text-neutral-900">
        Ping
      </a>

      {loading ? null : handle ? (
        <div className="flex items-center gap-4">
          <a href={`/${handle}`} className="underline text-neutral-900">
            @{handle}
          </a>
          <button onClick={handleLogout} className="text-sm text-gray-500 underline hover:text-neutral-900">
            Log out
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <a href="/login" className="underline text-neutral-900">
            Log in
          </a>
          <a href="/signup" className="bg-black text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-neutral-800 transition-colors">
            Sign up
          </a>
        </div>
      )}
    </nav>
  );
}