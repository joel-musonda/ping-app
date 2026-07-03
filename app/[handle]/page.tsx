"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { databases, DATABASE_ID, PINGS_COLLECTION_ID } from "@/lib/appwrite";
import { Query } from "appwrite";

export default function PingProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const [ping, setPing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    databases
      .listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [Query.equal("handle", handle)])
      .then((res) => {
        setPing(res.documents.length > 0 ? res.documents[0] : false);
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
      <p className="text-sm text-gray-400 mt-4">No notebooks yet.</p>
    </main>
  );
}