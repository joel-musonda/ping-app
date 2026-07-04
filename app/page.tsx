"use client";

import { useEffect, useState } from "react";
import { getPublicNotebooks, getPingByUserId, getNotebookEngagement } from "@/lib/appwrite";
import { Heart, MessageCircle, Book } from "lucide-react";

function FeedCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-xl p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-gray-100" />
        <div className="h-3 bg-gray-100 rounded w-24" />
      </div>
      <div className="h-5 bg-gray-100 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-full mb-1" />
      <div className="h-4 bg-gray-100 rounded w-2/3 mb-4" />
      <div className="flex gap-4">
        <div className="h-3 bg-gray-100 rounded w-10" />
        <div className="h-3 bg-gray-100 rounded w-10" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicNotebooks()
      .then(async (nbs) => {
        const enriched = await Promise.all(
          nbs.map(async (nb) => {
            const [ping, engagement] = await Promise.all([
              getPingByUserId(nb.owner_id),
              getNotebookEngagement(nb.$id),
            ]);
            return {
              ...nb,
              authorHandle: ping?.handle ?? "unknown",
              likeCount: engagement.likes,
              commentCount: engagement.comments,
              chapterCount: engagement.chapterCount,
            };
          })
        );
        setNotebooks(enriched);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ping</h1>

      <div className="flex flex-col gap-4">
        {loading ? (
          <>
            <FeedCardSkeleton />
            <FeedCardSkeleton />
            <FeedCardSkeleton />
          </>
        ) : notebooks.length === 0 ? (
          <p className="text-sm text-gray-400">No public notebooks yet.</p>
        ) : (
          notebooks.map((nb) => (
            <a
              key={nb.$id}
              href={`/notebooks/${nb.$id}`}
              className="block border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              {/* Author row */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center uppercase shrink-0">
                  {nb.authorHandle.charAt(0)}
                </div>
                <span className="text-xs text-gray-500">
                  by <span className="font-medium text-gray-700">@{nb.authorHandle}</span>
                </span>
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-gray-900 mb-1.5 leading-snug">
                {nb.title}
              </h2>

              {/* Snapshot / description */}
              {(nb.snapshot || nb.description) && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                  {nb.snapshot || nb.description}
                </p>
              )}

              {/* Engagement footer */}
              <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" />
                  {nb.likeCount}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {nb.commentCount}
                </span>
                <span className="flex items-center gap-1">
                  <Book className="w-3.5 h-3.5" />
                  {nb.chapterCount} {nb.chapterCount === 1 ? "chapter" : "chapters"}
                </span>
              </div>
            </a>
          ))
        )}
      </div>
    </main>
  );
}