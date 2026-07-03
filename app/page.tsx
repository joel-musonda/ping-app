"use client";

import { useEffect, useState } from "react";
import { getPublicNotebooks, getPingByUserId } from "@/lib/appwrite";

export default function HomePage() {
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicNotebooks()
      .then(async (nbs) => {
        const withAuthors = await Promise.all(
          nbs.map(async (nb) => {
            const ping = await getPingByUserId(nb.owner_id);
            return { ...nb, authorHandle: ping?.handle ?? "unknown" };
          })
        );
        setNotebooks(withAuthors);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ping</h1>

      <ul className="flex flex-col gap-4">
        {notebooks.map((nb) => (
          <li key={nb.$id} className="border-b pb-3">
            <a href={`/notebooks/${nb.$id}`} className="text-lg font-semibold underline">
              {nb.title}
            </a>
            {nb.description && (
              <p className="text-sm text-gray-500 mt-1">{nb.description}</p>
            )}
            <a href={`/${nb.authorHandle}`} className="text-sm text-gray-400 mt-1 block">
              by @{nb.authorHandle}
            </a>
          </li>
        ))}
        {notebooks.length === 0 && (
          <p className="text-sm text-gray-400">No public notebooks yet.</p>
        )}
      </ul>
    </main>
  );
}