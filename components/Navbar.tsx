"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, logOut } from "@/lib/auth";
import { getPingByUserId } from "@/lib/appwrite";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [handle, setHandle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  return (
    <nav className="flex items-center justify-between p-4 border-b">
      <a href="/" className="font-bold text-lg">
        Ping
      </a>

      {loading ? null : handle ? (
        <div className="flex items-center gap-4">
          <a href={`/${handle}`} className="underline">
            @{handle}
          </a>
          <button onClick={handleLogout} className="text-sm text-gray-500 underline">
            Log out
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <a href="/login" className="underline">
            Log in
          </a>
          <a href="/signup" className="bg-black text-white rounded px-3 py-1.5 text-sm">
            Sign up
          </a>
        </div>
      )}
    </nav>
  );
}