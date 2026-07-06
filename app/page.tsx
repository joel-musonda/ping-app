"use client";

import { useEffect, useState } from "react";
import { getPublicNotebooks, getPingByUserId, getNotebookEngagement } from "@/lib/appwrite";
import { Heart, MessageCircle, Book, ArrowUpRight, Folder, Flame, X } from "lucide-react";

function FeedCardSkeleton() {
  return (
    <div className="py-6 border-b border-neutral-100 animate-pulse">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-5 h-5 rounded-full bg-neutral-100" />
        <div className="h-3 bg-neutral-100 rounded w-20" />
      </div>
      <div className="h-6 bg-neutral-100 rounded w-3/4 mb-2" />
      <div className="h-4 bg-neutral-100 rounded w-full mb-1" />
      <div className="h-4 bg-neutral-100 rounded w-2/3 mb-4" />
      <div className="flex gap-4">
        <div className="h-3.5 bg-neutral-100 rounded w-8" />
        <div className="h-3.5 bg-neutral-100 rounded w-8" />
      </div>
    </div>
  );
}

function TrendingList({ loading, trendingNotebooks }: { loading: boolean; trendingNotebooks: any[] }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-1.5 animate-pulse">
            <div className="h-3.5 bg-neutral-100 rounded w-full" />
            <div className="h-3 bg-neutral-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (trendingNotebooks.length === 0) {
    return <p className="text-xs text-neutral-400 italic">No metrics analyzed yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {trendingNotebooks.map((nb, index) => (
        <li key={nb.$id} className="flex items-start gap-3.5 group relative">
          <span className="text-xl font-black text-neutral-200 group-hover:text-neutral-400 transition-colors leading-none select-none w-4">
            0{index + 1}
          </span>
          <div className="space-y-0.5 min-w-0">
            <a href={`/notebooks/${nb.$id}`} className="block text-xs font-bold text-neutral-900 hover:underline leading-snug truncate">
              {nb.title}
            </a>
            <p className="text-[11px] text-neutral-400 font-medium">by @{nb.authorHandle}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function HomePage() {
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingSheetOpen, setTrendingSheetOpen] = useState(false);

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
              authorName: ping?.name ?? "Anonymous Writer",
              authorAvatar: ping?.avatar_url ?? "",
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

  const trendingNotebooks = [...notebooks]
    .sort((a, b) => (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount))
    .slice(0, 4);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 bg-white min-h-[calc(100vh-56px)] select-none text-neutral-950">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

        {/* Left/Middle Core Dashboard */}
        <div className="col-span-1 md:col-span-2 space-y-1">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-2">
            <Folder className="w-4 h-4 text-neutral-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Explore Ping Notebooks
            </h2>
          </div>

          {loading ? (
            <>
              <FeedCardSkeleton />
              <FeedCardSkeleton />
              <FeedCardSkeleton />
            </>
          ) : notebooks.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-neutral-200 rounded-xl mt-4">
              <Book className="w-5 h-5 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-400 font-medium">No public notebooks available yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {notebooks.map((nb) => (
                <article key={nb.$id} className="py-6 group relative block">
                  <a href={`/notebooks/${nb.$id}`} className="absolute inset-0 z-0" />

                  <div className="flex justify-between gap-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2.5 relative z-10 text-xs">
                        <div className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[9px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden border border-neutral-200">
                          {nb.authorAvatar ? (
                            <img src={nb.authorAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            nb.authorHandle.charAt(0)
                          )}
                        </div>
                        <span className="font-semibold text-neutral-800 hover:underline cursor-pointer">
                          {nb.authorName}
                        </span>
                        <span className="text-neutral-400 font-normal">@{nb.authorHandle}</span>
                        <span className="text-neutral-300 select-none">·</span>
                        <span className="text-neutral-400">
                          {nb.$createdAt ? new Date(nb.$createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now'}
                        </span>
                      </div>

                      <div className="flex justify-between items-start gap-4 mb-1.5">
                        <h3 className="text-lg font-bold tracking-tight text-neutral-900 group-hover:text-neutral-800 leading-snug transition-colors">
                          {nb.title}
                        </h3>
                        {!nb.cover_image_url && (
                          <ArrowUpRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1" />
                        )}
                      </div>

                      {(nb.snapshot || nb.description) && (
                        <p className="text-sm text-neutral-500 font-normal line-clamp-2 leading-relaxed mb-3.5 max-w-xl">
                          {nb.snapshot || nb.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] font-bold text-neutral-400 relative z-10">
                        <button className="flex items-center gap-1.5 hover:text-neutral-900 transition-colors group/btn py-1">
                          <Heart className="w-3.5 h-3.5 text-neutral-400 group-hover/btn:text-rose-500 transition-colors" />
                          <span>{nb.likeCount}</span>
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-neutral-900 transition-colors group/btn py-1">
                          <MessageCircle className="w-3.5 h-3.5 text-neutral-400 group-hover/btn:text-blue-500 transition-colors" />
                          <span>{nb.commentCount}</span>
                        </button>
                        <div className="flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/60 font-semibold uppercase tracking-wider ml-auto">
                          <Book className="w-3 h-3 text-neutral-400" />
                          <span>{nb.chapterCount} {nb.chapterCount === 1 ? "chapter" : "chapters"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cover image thumbnail — only rendered if the notebook has one */}
                    {nb.cover_image_url && (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200">
                        <img
                          src={nb.cover_image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                </article>
              ))}
            </div>
          )}
        </div>

        {/* Right Sticky Sidebar — desktop only */}
        <div className="col-span-1 hidden md:block">
          <div className="sticky top-24 space-y-8 pl-4 border-l border-neutral-100">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                <Flame className="w-4 h-4 text-neutral-900" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Trending on Ping
                </h2>
              </div>
              <TrendingList loading={loading} trendingNotebooks={trendingNotebooks} />
            </div>

            <div className="pt-4 border-t border-neutral-100 text-[10px] text-neutral-400 font-medium space-y-1">
              <p>© 2026 Ping Inc.</p>
              <p className="leading-normal">Great ideas change the world, share yours on Ping.</p>
            </div>
          </div>
        </div>

      </div>

      {/* MOBILE: Floating Action Button for Trending — only visible below md */}
      <button
        onClick={() => setTrendingSheetOpen(true)}
        className="md:hidden fixed bottom-6 right-5 z-40 w-12 h-12 rounded-full bg-neutral-900 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        title="Trending on Ping"
      >
        <Flame className="w-5 h-5" />
      </button>

      {/* MOBILE: Backdrop + Bottom Sheet */}
      {trendingSheetOpen && (
        <>
          <div
            onClick={() => setTrendingSheetOpen(false)}
            className="md:hidden fixed inset-0 bg-neutral-950/40 z-40"
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-neutral-900" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Trending on Ping
                </h2>
              </div>
              <button
                onClick={() => setTrendingSheetOpen(false)}
                className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-5">
              <TrendingList loading={loading} trendingNotebooks={trendingNotebooks} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}