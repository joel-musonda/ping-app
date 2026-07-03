"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { databases, DATABASE_ID, PINGS_COLLECTION_ID, getNotebooksForUser } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";
import { Query } from "appwrite";

export default function PingProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const [ping, setPing] = useState<any>(null);
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    databases
      .listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [Query.equal("handle", handle)])
      .then(async (res) => {
        if (res.documents.length === 0) {
          setPing(false);
          return;
        }
        const pingDoc = res.documents[0];
        setPing(pingDoc);

        const currentUser = await getCurrentUser();
        const isOwnProfile = currentUser?.$id === pingDoc.user_id;

        const nbs = await getNotebooksForUser(pingDoc.user_id, !isOwnProfile);
        setNotebooks(nbs);
      })
      .catch((err) => {
        console.error(err);
        setPing(false);
      })
      .finally(() => setLoading(false));
  }, [handle]);

  if (loading) return <p className="p-8">Loading...</p>;
  if (!ping) return <p className="p-8">Profile not found.</p>;

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">@{ping.handle}</h1>
      {ping.bio && <p className="text-gray-600 mt-2">{ping.bio}</p>}

      <h2 className="text-lg font-semibold mt-8 mb-2">Notebooks</h2>
      <ul className="flex flex-col gap-2">
        {notebooks.map((nb) => (
          <li key={nb.$id}>
            <a href={`/notebooks/${nb.$id}`} className="underline">
              {nb.title} {!nb.is_public && "🔒"}
            </a>
          </li>
        ))}
        {notebooks.length === 0 && (
          <p className="text-sm text-gray-400">No notebooks yet.</p>
        )}
      </ul>
    </main>
  );
}