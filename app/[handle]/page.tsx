"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  databases,
  DATABASE_ID,
  PINGS_COLLECTION_ID,
  getNotebooksForUser,
  checkIsFollowing,
  followUser,
  unfollowUser,
  getPingByUserId,
  getFollowerCount,
  getFollowingCount,
  getUserActivityDates,
} from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";
import { Query } from "appwrite";
import { Book, MapPin, Link2, Users, FileText, Share2, Percent, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Pure CSS Skeleton components to match Shadcn UI design guidelines
function ProfileSkeleton() {
  return (
    <div className="flex flex-col space-y-4 animate-pulse">
      <div className="w-32 h-32 md:w-40 md:h-40 bg-neutral-100 rounded-full shrink-0" />
      <div className="space-y-2">
        <div className="h-6 bg-neutral-100 rounded w-3/4" />
        <div className="h-4 bg-neutral-100 rounded w-1/2" />
      </div>
      <div className="h-9 bg-neutral-100 rounded-md w-full" />
      <div className="space-y-2 pt-2">
        <div className="h-4 bg-neutral-100 rounded w-full" />
        <div className="h-4 bg-neutral-100 rounded w-5/6" />
      </div>
      <div className="h-4 bg-neutral-100 rounded w-2/3 pt-1" />
      <div className="space-y-2 pt-3 border-t border-neutral-100">
        <div className="h-3 bg-neutral-100 rounded w-1/2" />
        <div className="h-3 bg-neutral-100 rounded w-2/3" />
      </div>
    </div>
  );
}

function NotebookSkeleton() {
  return (
    <div className="border border-neutral-200 rounded-xl p-4 space-y-3 bg-white animate-pulse">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 w-2/3">
          <div className="w-4 h-4 bg-neutral-100 rounded shrink-0" />
          <div className="h-4 bg-neutral-100 rounded w-full" />
        </div>
        <div className="w-3.5 h-3.5 bg-neutral-100 rounded shrink-0" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 bg-neutral-100 rounded w-full" />
        <div className="h-3 bg-neutral-100 rounded w-4/5" />
      </div>
      <div className="flex gap-2 pt-1">
        <div className="h-4 bg-neutral-100 rounded w-12" />
        <div className="h-4 bg-neutral-100 rounded w-24" />
      </div>
    </div>
  );
}

export default function PingProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();

  const [ping, setPing] = useState<any>(null);
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [activityDates, setActivityDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;

    databases
      .listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [Query.equal("handle", handle)])
      .then(async (res) => {
        if (cancelled) return;

        if (res.documents.length === 0) {
          setPing(false);
          return;
        }
        const pingDoc = res.documents[0];
        setPing(pingDoc);

        const sessionUser = await getCurrentUser();
        if (cancelled) return;
        setCurrentUser(sessionUser);

        if (sessionUser) {
          const profileMatch = sessionUser.$id === pingDoc.user_id;
          setIsOwnProfile(profileMatch);

          if (!profileMatch) {
            const activeFollowId = await checkIsFollowing(sessionUser.$id, pingDoc.user_id);
            if (!cancelled) setFollowId(activeFollowId);
          }
        }

        const [nbs, followers, following, activity] = await Promise.all([
          getNotebooksForUser(pingDoc.user_id, !(sessionUser?.$id === pingDoc.user_id)),
          getFollowerCount(pingDoc.user_id),
          getFollowingCount(pingDoc.user_id),
          getUserActivityDates(pingDoc.user_id),
        ]);

        if (cancelled) return;
        setNotebooks(nbs);
        setFollowerCount(followers);
        setFollowingCount(following);
        setActivityDates(activity);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setPing(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [handle]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setActionLoading(true);
    try {
      if (followId) {
        await unfollowUser(followId);
        setFollowId(null);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        const viewerPing = await getPingByUserId(currentUser.$id);
        await followUser(
          currentUser.$id,
          ping.user_id,
          viewerPing?.name || "Workspace Member",
          viewerPing?.handle || "anonymous"
        );
        const updatedFollowId = await checkIsFollowing(currentUser.$id, ping.user_id);
        setFollowId(updatedFollowId);
        setFollowerCount((c) => c + 1);
      }
    } catch (err) {
      console.error("Failed to complete social operation:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!loading && !ping) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white text-center p-4">
        <h2 className="text-xl font-bold text-neutral-900">Workspace Not Found</h2>
        <p className="text-sm text-neutral-500 mt-1">The handle @{handle} does not exist.</p>
      </div>
    );
  }

  return (
    <main className="max-w-6xl w-full mx-auto px-4 md:px-6 py-4 bg-white text-neutral-900 md:h-[calc(100vh-65px)] md:overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 h-full">

        {/* Left Profile Sidebar */}
        <div className="col-span-1 flex flex-col space-y-4 md:overflow-y-auto md:pr-2 h-full pb-4 md:pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <ProfileSkeleton />
          ) : (
            <>
            <div className="w-32 h-32 md:w-40 md:h-40 bg-neutral-100 rounded-full border border-neutral-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm relative">
                {ping?.avatar_url ? (
                  <img
                    src={ping.avatar_url}
                    alt={`${ping?.name || handle}'s avatar`}
                    className="w-full h-full object-cover"
                    decoding="async"
                  />
                ) : (
                  <span className="text-4xl md:text-5xl font-bold text-neutral-300 uppercase select-none">
                    {handle?.charAt(0)}
                  </span>
                )}
              </div>

              <div className="space-y-0.5 shrink-0">
                <h2 className="text-xl font-bold tracking-tight text-neutral-900 leading-tight">
                  {ping?.name || handle}
                </h2>
                <p className="text-sm font-medium text-neutral-400">@{ping?.handle}</p>
              </div>

              {isOwnProfile ? (
                <button
                  onClick={() => router.push("/settings/profile")}
                  className="w-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm font-medium py-2 px-4 rounded-md shadow-sm transition-colors shrink-0"
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  onClick={handleFollowToggle}
                  disabled={actionLoading}
                  className={`w-full text-sm font-medium py-2 px-4 rounded-md shadow-sm transition-colors shrink-0 ${
                    followId
                      ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200"
                      : "bg-neutral-900 hover:bg-neutral-800 text-white"
                  }`}
                >
                  {actionLoading ? "Processing..." : followId ? "Unfollow" : "Follow"}
                </button>
              )}

              <p className="text-sm text-neutral-700 leading-relaxed pt-1 shrink-0 break-words whitespace-pre-wrap">
                {ping?.bio || "Hello, Welcome to my Ping"}
              </p>

              <div className="flex items-center gap-3 text-xs text-neutral-600 pt-1 shrink-0">
                <div className="flex items-center gap-1 hover:text-neutral-900 cursor-pointer">
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="font-bold text-neutral-900">{followerCount}</span>
                  <span>followers</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1 hover:text-neutral-900 cursor-pointer">
                  <span className="font-bold text-neutral-900">{followingCount}</span>
                  <span>following</span>
                </div>
              </div>

              {ping?.location || ping?.website ? (
                <div className="space-y-2 pt-3 text-xs font-medium text-neutral-500 border-t border-neutral-100 shrink-0">
                  {ping?.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-neutral-400" />
                      <span>{ping.location}</span>
                    </div>
                  )}
                  {ping?.website && (
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-neutral-400" />
                      <a
                        href={ping.website.startsWith("http") ? ping.website : `https://${ping.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-900 hover:underline break-all"
                      >
                        {ping.website}
                      </a>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Right Dashboard Feed */}
        <div className="col-span-1 md:col-span-3 flex flex-col space-y-8 md:overflow-y-auto md:pr-1 h-full pb-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          <div className="space-y-4 shrink-0">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Notebooks</h3>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NotebookSkeleton />
                <NotebookSkeleton />
                <NotebookSkeleton />
                <NotebookSkeleton />
              </div>
            ) : notebooks.length === 0 ? (
              <div className="border border-dashed border-neutral-200 rounded-xl p-8 text-center">
                <Book className="w-6 h-6 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-neutral-500">No notebooks available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {notebooks.map((nb) => {
                  const createdDate = nb.$createdAt
                    ? new Date(nb.$createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Recently";

                  return (
                    <a key={nb.$id} href={`/notebooks/${nb.$id}`} className="block group">
                      <Card className="h-full border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm transition-all duration-200 rounded-xl">
                        <CardHeader className="p-4 flex flex-col justify-between h-full space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Book className="w-4 h-4 text-neutral-500 shrink-0" />
                                <CardTitle className="text-sm font-bold text-neutral-900 truncate underline-offset-2 decoration-1">
                                  {nb.title}
                                </CardTitle>
                              </div>
                              {!nb.is_public && <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                            </div>
                            <CardDescription className="text-xs text-neutral-500 font-normal line-clamp-2 pt-0.5 leading-relaxed">
                              Click to open this synchronized notebook and manage its active layout chapters.
                            </CardDescription>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-neutral-400 pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200 font-semibold text-[9px]">
                              {nb.is_public ? "Public" : "Private"}
                            </span>
                            <span>• Created {createdDate}</span>
                          </div>
                        </CardHeader>
                      </Card>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity Streak Matrix Panel — now driven by real chapter edit dates */}
          <div className="space-y-4 pt-4 border-t border-neutral-100 shrink-0">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Activity</h3>

            <div className="flex items-center gap-6 text-xs font-bold text-neutral-400 border-b border-b-neutral-100 pb-2">
              <div className="flex items-center gap-1.5 text-neutral-900 border-b-2 border-b-neutral-900 pb-2 -mb-[9px] cursor-pointer">
                <FileText className="w-3.5 h-3.5" />
                <span>Notebooks</span>
              </div>

               {/*<div className="flex items-center gap-1.5 hover:text-neutral-600 cursor-pointer pb-2">
                <Share2 className="w-3.5 h-3.5" />
                <span>0 snippets</span>
              </div>*/}
              {/*<div className="flex items-center gap-1.5 hover:text-neutral-600 cursor-pointer pb-2">
                <Percent className="w-3.5 h-3.5" />
                <span>0% linked</span>
              </div>*/}
            </div> 

            <div className="p-4 bg-white border border-neutral-200 rounded-xl overflow-x-auto [scrollbar-width:thin]">
              <div className="min-w-[620px] space-y-1">
                <div className="flex gap-1 text-[10px] font-medium text-neutral-400 mb-1 pl-7">
                  <span className="w-10">Jun/Jul</span>
                  <span className="w-10">Aug</span>
                  <span className="w-10">Sep</span>
                  <span className="w-10">Oct</span>
                  <span className="w-10">Nov</span>
                  <span className="w-10">Dec</span>
                  <span className="w-10">Jan</span>
                  <span className="w-10">Feb</span>
                  <span className="w-10">Mar</span>
                  <span className="w-10">Apr</span>
                  <span className="w-10">May</span>
                  <span className="w-10">Jun</span>
                  <span className="w-10">Jul</span>
                </div>
               {(() => {
  const today = new Date();
  const todayDayOfWeek = today.getDay(); // 0=Sun ... 6=Sat

  // Sunday of the current week
  const currentWeekSunday = new Date(today);
  currentWeekSunday.setDate(today.getDate() - todayDayOfWeek);

  const totalWeeks = 50;
  const firstWeekSunday = new Date(currentWeekSunday);
  firstWeekSunday.setDate(currentWeekSunday.getDate() - (totalWeeks - 1) * 7);

  const rows = [
    { label: "Mon", dayOfWeek: 1 },
    { label: "Wed", dayOfWeek: 3 },
    { label: "Fri", dayOfWeek: 5 },
  ];

  return rows.map(({ label, dayOfWeek }) => (
    <div key={label} className="flex items-center gap-1">
      <span className="w-6 text-[9px] text-neutral-400 font-medium text-left select-none">
        {label}
      </span>

      {Array.from({ length: totalWeeks }).map((_, weekIndex) => {
        const cellDate = new Date(firstWeekSunday);
        cellDate.setDate(firstWeekSunday.getDate() + weekIndex * 7 + dayOfWeek);

        const dateStr = cellDate.toISOString().split("T")[0];
        const isActive = activityDates.has(dateStr);
        const isFuture = cellDate > today;

        return (
          <span
            key={weekIndex}
            title={dateStr}
            className="w-2.5 h-2.5 rounded-[2px] block shrink-0 transition-colors"
            style={{
              backgroundColor: loading || isFuture ? "#F4F4F5" : isActive ? "#A2CFFE" : "#F4F4F5",
            }}
          />
        );
      })}
    </div>
  ));
})()}

               

                  
              </div>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}