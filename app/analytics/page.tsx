"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNotebooksForUser, getNotebookEngagement, databases, DATABASE_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { 
  BarChart3, Eye, Heart, MessageSquare, TrendingUp, 
  BookOpen, Award, ArrowUpRight, Share2, ChevronRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notebookStats, setNotebookStats] = useState<any[]>([]);
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

        // 1. Fetch all notebooks owned by the user (passing false for isPublic to get both public and private)
        const ownerNotebooks = await getNotebooksForUser(user.$id, false);
        
        // 2. Enrich notebooks with performance stats
        const enrichedStats = await Promise.all(
          ownerNotebooks.map(async (nb: any) => {
            const engagement = await getNotebookEngagement(nb.$id);
            
            // Mocking view count lookup — replace this with an actual Appwrite query to a 'notebook_views' collection if created
            // e.g., databases.listDocuments(DATABASE_ID, VIEWS_COLLECTION_ID, [Query.equal("notebook_id", nb.$id)])
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
              // Calculation for score-based performance sorting
              performanceScore: mockViews + (engagement.likes * 3) + (engagement.comments * 5)
            };
          })
        );

        if (cancelled) return;

        // Sort notebooks by highest performance score first
        enrichedStats.sort((a, b) => b.performanceScore - a.performanceScore);
        setNotebookStats(enrichedStats);

        // 3. Compute overall high-level summary metrics
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

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        <div className="h-6 bg-neutral-100 rounded w-1/4 mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-neutral-100 rounded-xl" />)}
        </div>
        <div className="h-64 bg-neutral-100 rounded-xl" />
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 bg-white min-h-[calc(100vh-56px)] select-none text-neutral-950">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-5 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-neutral-900" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Notebook Insights</h2>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Performance Analytics</h1>
        </div>
      </div>

      {/* Top 4 Performance High-Level Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-neutral-200 shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Reach</p>
              <p className="text-xl font-black text-neutral-900">{summary.totalViews}</p>
            </div>
            <div className="p-2 bg-neutral-50 border border-neutral-100 rounded-lg text-neutral-600">
              <Eye className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Appreciation</p>
              <p className="text-xl font-black text-neutral-900">{summary.totalLikes}</p>
            </div>
            <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-600">
              <Heart className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Discussions</p>
              <p className="text-xl font-black text-neutral-900">{summary.totalComments}</p>
            </div>
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600">
              <MessageSquare className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Avg Engagement</p>
              <p className="text-xl font-black text-neutral-900">{summary.avgEngagementRate}%</p>
            </div>
            <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Bar Graph Row */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card className="border-neutral-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="p-4 border-b border-neutral-100 bg-neutral-50/50">
            <CardTitle className="text-sm font-bold text-neutral-900">Traffic Distribution</CardTitle>
            <CardDescription className="text-xs text-neutral-500">Comparative views across your top active notebooks</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {notebookStats.length === 0 ? (
              <p className="text-xs text-neutral-400 italic text-center py-6">Create a notebook to populate graphs.</p>
            ) : (
              <div className="space-y-4 pt-2">
                {notebookStats.slice(0, 5).map((nb) => {
                  // Percentage width math calculation for the simple bar chart layout
                  const maxViews = Math.max(...notebookStats.map(n => n.views)) || 1;
                  const barWidthPercent = Math.max(8, Math.round((nb.views / maxViews) * 100));

                  return (
                    <div key={nb.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-neutral-800 truncate max-w-[70%]">{nb.title}</span>
                        <span className="font-medium text-neutral-500">{nb.views} unique views</span>
                      </div>
                      <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-neutral-900 rounded-full transition-all duration-500" 
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

      {/* Detailed Notebook Breakdown Table / List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Notebook Breakdown</h3>
        
        {notebookStats.length === 0 ? (
          <div className="border border-dashed border-neutral-200 rounded-xl p-8 text-center">
            <BookOpen className="w-5 h-5 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs text-neutral-500 font-medium">No performance records found.</p>
          </div>
        ) : (
          <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-sm bg-white divide-y divide-neutral-100">
            {notebookStats.map((nb) => (
              <div 
                key={nb.id} 
                onClick={() => router.push(`/notebooks/${nb.id}`)}
                className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-neutral-50/50 transition cursor-pointer group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-neutral-900 group-hover:underline truncate">
                      {nb.title}
                    </h4>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      nb.isPublic ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                    }`}>
                      {nb.isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-medium">
                    {nb.chapters} {nb.chapters === 1 ? "chapter" : "chapters"} loaded inside workspace
                  </p>
                </div>

                {/* Inline Performance Numbers Group */}
                <div className="flex items-center gap-6 sm:gap-8 text-xs shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-neutral-100 pt-3 sm:pt-0">
                  <div className="text-center sm:text-right">
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Views</span>
                    <span className="font-bold text-neutral-900">{nb.views}</span>
                  </div>
                  <div className="text-center sm:text-right">
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Likes</span>
                    <span className="font-bold text-neutral-900">{nb.likes}</span>
                  </div>
                  <div className="text-center sm:text-right">
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Comments</span>
                    <span className="font-bold text-neutral-900">{nb.comments}</span>
                  </div>
                  <div className="p-1.5 rounded-lg border border-neutral-200 text-neutral-400 group-hover:text-neutral-900 group-hover:bg-white transition shadow-sm shrink-0 hidden sm:block">
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