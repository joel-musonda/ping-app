"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPublicNotebooks, getPingByUserId, getNotebookEngagement } from "@/lib/appwrite";
import { Heart, MessageCircle, Book, ArrowUpRight, Folder, Flame, X, Loader2 } from "lucide-react";
import HoverCard from "@/components/HoverCard";

function FeedCardSkeleton() {
  return (
    <div className="p-4 sm:p-5 bg-neutral-100/80 dark:bg-neutral-900/80 rounded-2xl border border-neutral-200/60 dark:border-neutral-800 animate-pulse mb-4 box-border w-full">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        </div>
        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-28" />
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-20 h-28 sm:h-20 rounded-xl bg-neutral-200 dark:bg-neutral-800 shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
          <div className="h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded w-full" />
          <div className="h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3" />
        </div>
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
            <div className="h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded w-full" />
            <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
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
      {trendingNotebooks.map((nb, index) => {
        const displayName = nb.authorName && nb.authorName.trim() !== "" ? nb.authorName : `@${nb.authorHandle}`;
        return (
          <li key={nb.$id} className="flex items-start gap-3.5 group relative">
            <span className="text-xl font-black text-neutral-300 dark:text-neutral-700 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors leading-none select-none w-4">
              0{index + 1}
            </span>
            <div className="space-y-0.5 min-w-0 flex-1">
              <a href={`/notebooks/${nb.$id}`} className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 transition-colors leading-snug truncate">
                {nb.title}
              </a>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium truncate">
                by{" "}
                <HoverCard handle={nb.authorHandle}>
                  <span className="text-neutral-700 dark:text-neutral-300 font-semibold hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">{displayName}</span>
                </HoverCard>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function HomePageInner() {
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [trendingSheetOpen, setTrendingSheetOpen] = useState(false);
  
  const loaderRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const PAGE_SIZE = 15;

  // Dynamic Page Title Effect
  useEffect(() => {
    document.title = "Homepage | Ping";
  }, []);

  // Initial load and enrichment function
  useEffect(() => {
    let isMounted = true;

    async function loadInitialFeed() {
      try {
        const nbs = await getPublicNotebooks();
        if (!isMounted) return;

        // Sort notebooks so that most recently updated ones appear at the top first
        const sortedRaw = nbs.sort(
          (a, b) => new Date(b.$updatedAt || b.$createdAt).getTime() - new Date(a.$updatedAt || a.$createdAt).getTime()
        );

        // Slice only the first page items to enrich
        const firstPageItems = sortedRaw.slice(0, PAGE_SIZE);
        setHasMore(sortedRaw.length > PAGE_SIZE);

        const enriched = await enrichNotebooks(firstPageItems);
        if (!isMounted) return;

        (window as any).__pingSortedRaw = sortedRaw;

        setNotebooks(enriched);
      } catch (err) {
        console.error("Failed to load public notebooks feed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitialFeed();

    return () => {
      isMounted = false;
    };
  }, []);

  async function enrichNotebooks(nbs: any[]) {
    return await Promise.all(
      nbs.map(async (nb) => {
        try {
          const [ping, engagement] = await Promise.all([
            getPingByUserId(nb.owner_id).catch(() => null),
            getNotebookEngagement(nb.$id).catch(() => ({ likes: 0, comments: 0, chapterCount: 0 })),
          ]);

          let collaboratorProfiles: any[] = [];
          if (nb.collaborator_ids && nb.collaborator_ids.length > 0) {
            const profiles = await Promise.all(
              nb.collaborator_ids.map((id: string) => getPingByUserId(id).catch(() => null))
            );
            collaboratorProfiles = profiles.filter(Boolean);
          }

          return {
            ...nb,
            authorHandle: ping?.handle ?? "unknown",
            authorName: ping?.name ?? "",
            authorAvatar: ping?.avatar_url ?? "",
            authorId: nb.owner_id,
            collaboratorProfiles,
            likeCount: engagement.likes,
            commentCount: engagement.comments,
            chapterCount: engagement.chapterCount,
          };
        } catch (innerErr) {
          console.error("Failed to enrich notebook:", innerErr);
          return {
            ...nb,
            authorHandle: "unknown",
            authorName: "",
            authorAvatar: "",
            authorId: nb.owner_id,
            collaboratorProfiles: [],
            likeCount: 0,
            commentCount: 0,
            chapterCount: 0,
          };
        }
      })
    );
  }

  // Load more pages for infinite scroll
  const loadMoreNotebooks = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const sortedRaw = (window as any).__pingSortedRaw || [];
      const nextPage = page + 1;
      const startIndex = page * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;
      const nextBatchRaw = sortedRaw.slice(startIndex, endIndex);

      if (nextBatchRaw.length === 0) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }

      const enrichedBatch = await enrichNotebooks(nextBatchRaw);

      setNotebooks((prev) => [...prev, ...enrichedBatch]);
      setPage(nextPage);
      if (endIndex >= sortedRaw.length) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more notebooks:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const currentLoader = loaderRef.current;
    if (!currentLoader) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !loadingMore) {
          loadMoreNotebooks();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observer.observe(currentLoader);

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, loading, loadingMore, page]);

  useEffect(() => {
    if (searchParams.get("trending") === "1") {
      setTrendingSheetOpen(true);
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  const trendingNotebooks = [...notebooks]
    .sort((a, b) => (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount))
    .slice(0, 4);

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-2 md:py-4 bg-white dark:bg-neutral-950 min-h-[calc(100vh-56px)] select-none text-neutral-950 dark:text-neutral-100 box-border w-full overflow-x-hidden pb-20 md:pb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

        {/* Left/Middle Core Dashboard */}
        <div className="col-span-1 md:col-span-2 space-y-4 min-w-0">
          <div className="flex items-center gap-2 border-b border-neutral-200/80 dark:border-neutral-800 pb-3 mb-2">
            <Folder className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 truncate">
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
            <div className="py-12 px-4 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-100/50 dark:bg-neutral-900/50 mt-4 box-border">
              <Book className="w-5 h-5 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">No public notebooks available yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notebooks.map((nb) => {
                const allParticipants = [
                  { $id: nb.authorId, handle: nb.authorHandle, avatar_url: nb.authorAvatar },
                  ...(nb.collaboratorProfiles || [])
                ];
                const maxDisplay = 3;
                const displayedParticipants = allParticipants.slice(0, maxDisplay);
                const overflowCount = allParticipants.length - maxDisplay;

                const hasName = nb.authorName && nb.authorName.trim() !== "";
                const authorDisplay = hasName ? nb.authorName : `@${nb.authorHandle}`;

                return (
                  <article
                    key={nb.$id}
                    className="p-4 sm:p-5 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/80 transition-all rounded-2xl border border-neutral-200/70 dark:border-neutral-800 shadow-sm relative block group box-border w-full overflow-hidden"
                  >
                    <a href={`/notebooks/${nb.$id}`} className="absolute inset-0 z-0" />

                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
                      
                      {/* Cover image thumbnail */}
                      {nb.cover_image_url ? (
                        <div className="w-full sm:w-28 sm:h-28 h-40 shrink-0 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 shadow-sm">
                          <img src={nb.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <div className="w-full sm:w-28 sm:h-28 h-32 shrink-0 rounded-xl overflow-hidden bg-neutral-200/70 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center text-neutral-400">
                          <Book className="w-8 h-8" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 w-full">
                        
                        {/* Top Bar Info: Avatar Stack + Author details */}
                        <div className="flex items-center justify-between gap-2 mb-2 relative z-10 text-xs flex-wrap">
                          <div className="flex items-center gap-2.5 min-w-0 max-w-full">
                            {/* Overlapping Avatars with +N overflow */}
                            <div className="flex items-center -space-x-2 overflow-hidden shrink-0">
                              {displayedParticipants.map((p, idx) => (
                                <HoverCard key={p.$id || idx} handle={p.handle}>
                                  <div className="w-6 h-6 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[9px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden border-2 border-white dark:border-neutral-900 shadow-sm cursor-pointer">
                                    {p.avatar_url ? (
                                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      p.handle?.charAt(0) || "U"
                                    )}
                                  </div>
                                </HoverCard>
                              ))}
                              {overflowCount > 0 && (
                                <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold flex items-center justify-center shrink-0 border-2 border-white dark:border-neutral-900 shadow-sm">
                                  +{overflowCount}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <HoverCard handle={nb.authorHandle}>
                                <span className="font-semibold text-neutral-900 dark:text-neutral-100 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer truncate max-w-[200px] sm:max-w-none">
                                  {authorDisplay}
                                </span>
                              </HoverCard>
                              <span className="text-neutral-300 dark:text-neutral-700 select-none">·</span>
                             
                              <span className="text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                                {nb.$updatedAt || nb.$createdAt ?
                                  new Date(nb.$updatedAt || nb.$createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now'}
                              </span>
                            </div>
                          </div>

                          <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 hidden sm:block" />
                        </div>

                        {/* Notebook Title */}
                        <h3 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 leading-snug transition-colors break-words mb-1">
                          {nb.title}
                        </h3>

                        {/* Snapshot or Description */}
                        {(nb.snapshot || nb.description) && (
                          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 font-normal line-clamp-2 leading-relaxed mb-3.5 break-words">
                            {nb.snapshot || nb.description}
                          </p>
                        )}

                        {/* Bottom Actions / Metrics as Pill Buttons */}
                        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 text-xs font-semibold text-neutral-600 dark:text-neutral-300 relative z-10 pt-1 flex-wrap">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-200/70 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors group/btn">
                              <Heart className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 group-hover/btn:text-rose-600 transition-colors" />
                              <span>{nb.likeCount}</span>
                            </button>
                            
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-200/70 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors group/btn">
                              <MessageCircle className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 group-hover/btn:text-blue-600 transition-colors" />
                              <span>{nb.commentCount}</span>
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-300 bg-neutral-200/70 dark:bg-neutral-800 px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider sm:ml-auto">
                            <Book className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                            <span>{nb.chapterCount} {nb.chapterCount === 1 ? "chapter" : "chapters"}</span>
                          </div>
                        </div>

                      </div>
                    </div>

                  </article>
                );
              })}

              {/* Infinite scroll loader trigger element */}
              <div ref={loaderRef} className="py-6 flex justify-center items-center w-full">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                    <span>Loading more notebooks...</span>
                  </div>
                )}
                {!hasMore && notebooks.length > 0 && (
                  <p className="text-xs text-neutral-400 font-medium">You have reached the end of the feed.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sticky Sidebar — desktop only */}
        <div className="col-span-1 hidden md:block">
          <div className="sticky top-20 space-y-8 pl-4 border-l border-neutral-200/80 dark:border-neutral-800">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-200/80 dark:border-neutral-800 pb-3">
                <Flame className="w-4 h-4 text-[#0084FF]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Trending on Ping
                </h2>
              </div>
              <TrendingList loading={loading} trendingNotebooks={trendingNotebooks} />
            </div>

            <div className="pt-4 border-t border-neutral-200/80 dark:border-neutral-800 text-[10px] text-neutral-500 dark:text-neutral-400 font-medium space-y-1">
              <p>© 2026 Ping Inc.</p>
              <p className="leading-normal">Great ideas change the world, share yours on Ping.</p>
            </div>
          </div>
        </div>

      </div>

      {/* MOBILE: Backdrop + Bottom Sheet */}
      {trendingSheetOpen && (
        <>
          <div
            onClick={() => setTrendingSheetOpen(false)}
            className="md:hidden fixed inset-0 bg-neutral-950/40 z-40 animate-in fade-in duration-200"
          />
          <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-neutral-100 dark:bg-neutral-900 rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 border-t border-neutral-200 dark:border-neutral-800 box-border">
            <div className="sticky top-0 bg-neutral-100/95 dark:bg-neutral-900/95 backdrop-blur-md flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 z-10">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#0084FF]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Trending on Ping
                </h2>
              </div>
              <button
                onClick={() => setTrendingSheetOpen(false)}
                className="p-1.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
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

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  );
}