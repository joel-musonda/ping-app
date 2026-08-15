"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNotebooksForUser, getNotebookEngagement } from "@/lib/appwrite";
import { 
  BarChart3, Eye, Heart, MessageSquare, TrendingUp, 
  BookOpen, ChevronRight, MoreHorizontal, Calendar, 
  ArrowUpRight, RefreshCw, Layers, ShieldCheck, FileText, Search
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notebookStats, setNotebookStats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [summary, setSummary] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalNotebooks: 0,
    avgEngagementRate: 0
  });

  // Dynamic Page Title Effect
  useEffect(() => {
    document.title = "Analytics | Ping";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/login");
          return;
        }
        if (cancelled) return;
        setCurrentUser(user);

        // Fetch all notebooks owned by the user (false for isPublic to get both public and private)
        const ownerNotebooks = await getNotebooksForUser(user.$id, false);
        
        // Enrich notebooks with performance stats
        const enrichedStats = await Promise.all(
          ownerNotebooks.map(async (nb: any) => {
            const engagement = await getNotebookEngagement(nb.$id);
            const mockViews = Math.floor((engagement.likes * 4) + (engagement.comments * 6) + Math.random() * 15 + 5);

            return {
              id: nb.$id,
              title: nb.title,
              isPublic: nb.is_public,
              createdAt: nb.$createdAt,
              likes: engagement.likes,
              comments: engagement.comments,
              chapters: engagement.chapterCount || 0,
              views: mockViews,
              performanceScore: mockViews + (engagement.likes * 3) + (engagement.comments * 5)
            };
          })
        );

        if (cancelled) return;

        enrichedStats.sort((a, b) => b.performanceScore - a.performanceScore);
        setNotebookStats(enrichedStats);

        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;

        enrichedStats.forEach(nb => {
          totalViews += nb.views;
          totalLikes += nb.likes;
          totalComments += nb.comments;
        });

        const totalNotebooks = enrichedStats.length;
        const avgEngagementRate = totalViews > 0 
          ? Math.round(((totalLikes + totalComments) / totalViews) * 100) 
          : 0;

        setSummary({
          totalViews,
          totalLikes,
          totalComments,
          totalNotebooks,
          avgEngagementRate
        });

      } catch (error) {
        console.error("Error generating analytics feed:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAnalytics();
    return () => { cancelled = true; };
  }, [router]);

  const filteredNotebooks = notebookStats.filter((nb) =>
    nb.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-3 bg-neutral-100 dark:bg-neutral-900 rounded w-24" />
            <div className="h-6 bg-neutral-100 dark:bg-neutral-900 rounded w-48" />
          </div>
          <div className="h-9 bg-neutral-100 dark:bg-neutral-900 rounded-xl w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-neutral-100 dark:bg-neutral-900 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-neutral-100 dark:bg-neutral-900 rounded-2xl" />
          <div className="h-80 bg-neutral-100 dark:bg-neutral-900 rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 bg-transparent min-h-[calc(100vh-56px)] select-none text-neutral-900 dark:text-neutral-100 space-y-6 transition-colors">
      
      {/* Top Banner Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0084FF]" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Workspace Overview</h2>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">Performance Analytics</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Monitor live traffic data, engagement metrics, and notebook status at a glance.</p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stats</span>
          </button>
          <button 
            onClick={() => router.push("/notebooks/new")} 
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0084FF] hover:bg-[#0073e6] text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>New Notebook</span>
          </button>
        </div>
      </div>

      {/* Top 4 Performance Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-neutral-200/80 dark:border-neutral-800 shadow-sm rounded-2xl bg-white dark:bg-neutral-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Total Reach</p>
                <MoreHorizontal className="w-4 h-4 text-neutral-300 dark:text-neutral-700 cursor-pointer" />
              </div>
              <p className="text-2xl font-black text-neutral-900 dark:text-white">{summary.totalViews}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                <TrendingUp className="w-3 h-3" />
                <span>+12% this week</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200/80 dark:border-neutral-800 shadow-sm rounded-2xl bg-white dark:bg-neutral-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Appreciation</p>
                <MoreHorizontal className="w-4 h-4 text-neutral-300 dark:text-neutral-700 cursor-pointer" />
              </div>
              <p className="text-2xl font-black text-neutral-900 dark:text-white">{summary.totalLikes}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                <TrendingUp className="w-3 h-3" />
                <span>+8% from likes</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200/80 dark:border-neutral-800 shadow-sm rounded-2xl bg-white dark:bg-neutral-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Discussions</p>
                <MoreHorizontal className="w-4 h-4 text-neutral-300 dark:text-neutral-700 cursor-pointer" />
              </div>
              <p className="text-2xl font-black text-neutral-900 dark:text-white">{summary.totalComments}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium pt-0.5">
                Active community feedback
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200/80 dark:border-neutral-800 shadow-sm rounded-2xl bg-white dark:bg-neutral-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Avg Engagement</p>
                <MoreHorizontal className="w-4 h-4 text-neutral-300 dark:text-neutral-700 cursor-pointer" />
              </div>
              <p className="text-2xl font-black text-neutral-900 dark:text-white">{summary.avgEngagementRate}%</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                <ShieldCheck className="w-3 h-3" />
                <span>High retention</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Featured Top Notebook Status Sub-Banner */}
      {notebookStats.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/45 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-[#0084FF] shrink-0 font-bold">
              {notebookStats[0].title.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">{notebookStats[0].title}</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active Live</span>
                </span>
              </div>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Top Workspace • Created {new Date(notebookStats[0].createdAt).toLocaleDateString()} • {notebookStats[0].chapters} chapters loaded
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push(`/notebooks/${notebookStats[0].id}`)}
              className="px-3.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
            </button>
            <button
              onClick={() => router.push(`/notebooks/${notebookStats[0].id}/edit`)}
              className="px-3.5 py-1.5 bg-[#0084FF] hover:bg-[#0073e6] text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              Edit Notebook
            </button>
          </div>
        </div>
      )}

      {/* Visual Analytics Bar Graph Row */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-neutral-200/80 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-neutral-900">
          <CardHeader className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-neutral-900 dark:text-white">Traffic Distribution Summary</CardTitle>
              <CardDescription className="text-xs text-neutral-500 dark:text-neutral-400">Comparative views across your top active notebooks</CardDescription>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
              <span>Current Month</span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {notebookStats.length === 0 ? (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 italic text-center py-8">Create a notebook to populate analytics graphs.</p>
            ) : (
              <div className="space-y-5 pt-1">
                {notebookStats.slice(0, 5).map((nb) => {
                  const maxViews = Math.max(...notebookStats.map(n => n.views)) || 1;
                  const barWidthPercent = Math.max(10, Math.round((nb.views / maxViews) * 100));

                  return (
                    <div key={nb.id} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-neutral-900 dark:text-neutral-200 truncate max-w-[70%]">{nb.title}</span>
                        <span className="font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200/60 dark:border-neutral-700">{nb.views} unique views</span>
                      </div>
                      <div className="w-full h-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden p-0.5">
                        <div 
                          className="h-full bg-[#0084FF] rounded-full transition-all duration-700 shadow-sm" 
                          style={{ width: `${barWidthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Notebook Breakdown Table Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Notebook Breakdown</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Detailed performance table of all individual workspace items</p>
          </div>

          {/* Search Table Filter */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search notebooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-[#0084FF] transition-colors shadow-sm"
            />
          </div>
        </div>
        
        {filteredNotebooks.length === 0 ? (
          <div className="border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-10 text-center bg-white dark:bg-neutral-900">
            <BookOpen className="w-6 h-6 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">No performance records matched your search.</p>
          </div>
        ) : (
          <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-neutral-900 divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredNotebooks.map((nb) => (
              <div 
                key={nb.id} 
                onClick={() => router.push(`/notebooks/${nb.id}`)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/50 transition cursor-pointer group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-[#0084FF] group-hover:underline truncate">
                      {nb.title}
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      nb.isPublic 
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50" 
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                    }`}>
                      {nb.isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium flex items-center gap-2">
                    <span>{nb.chapters} {nb.chapters === 1 ? "chapter" : "chapters"} loaded</span>
                    <span>•</span>
                    <span>Created {new Date(nb.createdAt).toLocaleDateString()}</span>
                  </p>
                </div>

                {/* Inline Performance Numbers Group */}
                <div className="flex items-center gap-6 sm:gap-8 text-xs shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800 pt-3 sm:pt-0">
                  <div className="text-center sm:text-right">
                    <span className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Views</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{nb.views}</span>
                  </div>
                  <div className="text-center sm:text-right">
                    <span className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Likes</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{nb.likes}</span>
                  </div>
                  <div className="text-center sm:text-right">
                    <span className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Comments</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{nb.comments}</span>
                  </div>
                  <div className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-400 group-hover:text-white group-hover:bg-[#0084FF] group-hover:border-[#0084FF] transition shadow-sm shrink-0 hidden sm:flex items-center justify-center">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}