"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  databases,
  DATABASE_ID,
  PINGS_COLLECTION_ID,
  FOLLOWS_COLLECTION_ID,
  getNotebooksForUser,
  checkIsFollowing,
  followUser,
  unfollowUser,
  getPingByUserId,
  getFollowerCount,
  getFollowingCount,
} from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";
import { Query } from "appwrite";
import { Book, MapPin, Link2, Users, FileText, Lock, Link, Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Modal, Button, Avatar, ListBox, Label, Description } from "@heroui/react";

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
  
  // Streak tracking states: Maps date strings to activity types ("notebook" | "chapter")
  const [activityMap, setActivityMap] = useState<Map<string, "notebook" | "chapter">>(new Map());

  // Modal State for Followers & Following Lists
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"followers" | "following">("followers");
  const [userList, setUserList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);

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

        const [nbs, followers, following] = await Promise.all([
          getNotebooksForUser(pingDoc.user_id, !(sessionUser?.$id === pingDoc.user_id)),
          getFollowerCount(pingDoc.user_id),
          getFollowingCount(pingDoc.user_id),
        ]);

        if (cancelled) return;
        setNotebooks(nbs);
        setFollowerCount(followers);
        setFollowingCount(following);

        // Map notebook creation vs chapter updates/creation
        const newActivityMap = new Map<string, "notebook" | "chapter">();
        
        nbs.forEach((nb: any) => {
          // Check for chapter creation dates if chapters exist on the notebook object
          const chapters = nb.chapters || nb.chapterList || nb.items || [];
          if (Array.isArray(chapters) && chapters.length > 0) {
            chapters.forEach((ch: any) => {
              const chDate = ch.$createdAt || ch.created_at;
              if (chDate) {
                const dateStr = chDate.split("T")[0];
                // Chapter activity sets lighter blue unless already overridden by a notebook
                if (!newActivityMap.has(dateStr)) {
                  newActivityMap.set(dateStr, "chapter");
                }
              }
            });
          }

          // Notebook creation takes precedence (blue dot)
          if (nb.$createdAt) {
            const dateStr = nb.$createdAt.split("T")[0];
            newActivityMap.set(dateStr, "notebook");
          }
        });

        setActivityMap(newActivityMap);
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

  // Dynamic Page Title Effect
  useEffect(() => {
    if (ping) {
      const displayName = ping.name || ping.handle || handle;
      document.title = `${displayName} | Ping`;
    } else if (ping === false) {
      document.title = "Ping | Not Found";
    }
  }, [ping, handle]);

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

  const handleOpenModal = async (type: "followers" | "following") => {
    if (!ping?.user_id) return;
    setModalType(type);
    setModalOpen(true);
    setListLoading(true);
    try {
      if (type === "followers") {
        const res = await databases.listDocuments(DATABASE_ID, FOLLOWS_COLLECTION_ID, [
          Query.equal("following_id", ping.user_id),
        ]);
        const followerUserIds = res.documents.map((d: any) => d.follower_id);
        if (followerUserIds.length > 0) {
          const pingsRes = await databases.listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [
            Query.equal("user_id", followerUserIds),
          ]);
          setUserList(pingsRes.documents);
        } else {
          setUserList([]);
        }
      } else {
        const res = await databases.listDocuments(DATABASE_ID, FOLLOWS_COLLECTION_ID, [
          Query.equal("follower_id", ping.user_id),
        ]);
        const followingUserIds = res.documents.map((d: any) => d.following_id);
        if (followingUserIds.length > 0) {
          const pingsRes = await databases.listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [
            Query.equal("user_id", followingUserIds),
          ]);
          setUserList(pingsRes.documents);
        } else {
          setUserList([]);
        }
      }
    } catch (err) {
      console.error("Failed to load user list:", err);
      setUserList([]);
    } finally {
      setListLoading(false);
    }
  };

  if (!loading && !ping) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white text-center p-4">
        <h2 className="text-xl font-bold text-neutral-900">Ping Not Found</h2>
        <p className="text-sm text-neutral-500 mt-1">The Username @{handle} does not exist.</p>
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
              {/* High-Quality Profile Avatar */}
              <div className="w-32 h-32 md:w-40 md:h-40 bg-neutral-100 rounded-full border border-neutral-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm relative">
                {ping?.avatar_url ? (
                  <img
                    src={ping.avatar_url}
                    alt={`${ping?.name || handle}'s avatar`}
                    className="w-full h-full object-cover rounded-full"
                    loading="eager"
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
                  onClick={() => router.push("/settings")}
                  className="w-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm font-medium py-2 px-4 rounded-md shadow-sm transition-colors shrink-0 cursor-pointer"
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
                      : "bg-[#0084FF] hover:bg-[#0073e6] text-white"
                  }`}
                >
                  {actionLoading ? "Processing..." : followId ? "Unfollow" : "Follow"}
                </button>
              )}

              <p className="text-sm text-neutral-700 leading-relaxed pt-1 shrink-0 break-words whitespace-pre-wrap">
                {ping?.bio || "Hello There, Welcome to my Ping"}
              </p>

              {/* Clickable Follow Stats */}
              <div className="flex items-center gap-3 text-xs text-neutral-600 pt-1 shrink-0">
                <div 
                  onClick={() => handleOpenModal("followers")}
                  className="flex items-center gap-1 hover:text-neutral-900 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="font-bold text-neutral-900">{followerCount}</span>
                  <span>followers</span>
                </div>
                <span>·</span>
                <div 
                  onClick={() => handleOpenModal("following")}
                  className="flex items-center gap-1 hover:text-neutral-900 cursor-pointer"
                >
                  <span className="font-bold text-neutral-900">{followingCount}</span>
                  <span>following</span>
                </div>
              </div>

              {ping?.location || ping?.website || ping?.github || ping?.twitter ? (
                <div className="space-y-2 pt-3 text-xs font-medium text-neutral-500 border-t border-neutral-100 shrink-0">
                  {ping?.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-neutral-400" />
                      <span>{ping.location}</span>
                    </div>
                  )}
                  {ping?.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-neutral-400" />
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
                  {ping?.github && (
                    <div className="flex items-center gap-2">
                      <Link className="w-4 h-4 text-neutral-400" />
                      <a
                        href={ping.github.startsWith("http") ? ping.github : `https://${ping.github.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-900 hover:underline break-all"
                      >
                        {ping.github.includes("github.com") ? ping.github.split("github.com/")[1] : ping.github}
                      </a>
                    </div>
                  )}
                  {ping?.twitter && (
                    <div className="flex items-center gap-2">
                      <Link className="w-4 h-4 text-neutral-400 " />
                      <a
                        href={ping.twitter.startsWith("http") ? ping.twitter : `https://${ping.twitter.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-900 hover:underline break-all"
                      >
                        {ping.twitter.startsWith("@") ? ping.twitter : `@${ping.twitter}`}
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
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Your Notebooks</h3>

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
                                <CardTitle className="text-sm font-bold text-neutral-900 line-clamp-2 underline-offset-2 decoration-1">
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

          {/* Activity Streak Matrix Panel */}
          <div className="space-y-4 pt-4 border-t border-neutral-100 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Activity</h3>
             
            </div>

            <div className="flex items-center gap-6 text-xs font-bold text-neutral-400 border-b border-b-neutral-100 pb-2">
              <div className="flex items-center gap-1.5 text-neutral-900 border-b-2 border-b-neutral-900 pb-2 -mb-[9px] cursor-pointer">
                <FileText className="w-3.5 h-3.5" />
                <span>Notebooks streak</span>
              </div>
            </div> 

            <div className="p-4 bg-white border border-neutral-200 rounded-xl overflow-x-auto [scrollbar-width:thin]">
              <div className="min-w-[620px] select-none">
                {(() => {
                  const today = new Date();
                  const totalWeeks = 53; 

                  const gridStartDate = new Date(today);
                  gridStartDate.setDate(today.getDate() - (totalWeeks - 1) * 7);
                  gridStartDate.setDate(gridStartDate.getDate() - gridStartDate.getDay());

                  const weeks = Array.from({ length: totalWeeks }).map((_, weekIndex) => {
                    return Array.from({ length: 7 }).map((_, dayIndex) => {
                      const date = new Date(gridStartDate);
                      date.setDate(gridStartDate.getDate() + weekIndex * 7 + dayIndex);
                      const dateStr = date.toISOString().split("T")[0];
                      const activityType = activityMap.get(dateStr);
                      return {
                        date,
                        dateStr,
                        activityType, // "notebook" | "chapter" | undefined
                        isFuture: date > today,
                      };
                    });
                  });

                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const monthLabels: { text: string; weekColIndex: number }[] = [];
                  let lastMonthName = "";

                  weeks.forEach((week, weekIndex) => {
                    const midDayDate = week[3].date;
                    const currentMonthName = months[midDayDate.getMonth()];
                    
                    if (currentMonthName !== lastMonthName) {
                      monthLabels.push({ text: currentMonthName, weekColIndex: weekIndex });
                      lastMonthName = currentMonthName;
                    }
                  });

                  const dayLabels = [
                    { label: "", index: 0 },
                    { label: "M", index: 1 },
                    { label: "", index: 2 },
                    { label: "W", index: 3 },
                    { label: "", index: 4 },
                    { label: "F", index: 5 },
                    { label: "", index: 6 },
                  ];

                  return (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex relative h-4 mb-0.5 text-[10px] font-medium text-neutral-400">
                        <div className="w-[26px] shrink-0" />
                        <div className="flex gap-[3.5px] relative w-full">
                          {monthLabels.map((ml, i) => {
                            const leftOffset = ml.weekColIndex * 13.5;
                            return (
                              <span 
                                key={i} 
                                className="absolute text-[10px]" 
                                style={{ left: `${leftOffset}px` }}
                              >
                                {ml.text}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <div className="flex flex-col gap-[3.5px] w-4 shrink-0 select-none">
                          {dayLabels.map((dl, idx) => (
                            <span 
                              key={idx} 
                              className="h-2.5 text-[9px] text-neutral-400 font-medium flex items-center justify-start leading-none"
                            >
                              {dl.label}
                            </span>
                          ))}
                        </div>

                        <div className="flex gap-[3.5px]">
                          {weeks.map((week, weekIdx) => (
                            <div key={weekIdx} className="flex flex-col gap-[3.5px]">
                              {week.map((day, dayIdx) => {
                                let bg = "#F4F4F5";
                                if (!loading && !day.isFuture) {
                                  if (day.activityType === "notebook") {
                                    bg = "#3B82F6"; // Darker blue for notebook creation
                                  } else if (day.activityType === "chapter") {
                                    bg = "#93C5FD"; // Lighter blue for chapter creation
                                  }
                                }

                                return (
                                  <span
                                    key={dayIdx}
                                    title={`${day.dateStr}: ${day.activityType ? day.activityType + ' created' : 'No activity'}`}
                                    className="w-2.5 h-2.5 rounded-[1.5px] block shrink-0 transition-colors"
                                    style={{ backgroundColor: bg }}
                                  />
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* HeroUI Followers / Following Modal */}
      <Modal isOpen={modalOpen} onOpenChange={setModalOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[400px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="text-sm font-bold capitalize">
                  {modalType}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="max-h-[360px] overflow-y-auto px-1">
                {listLoading ? (
                  <div className="py-8 text-center text-xs text-neutral-400 italic">Loading users...</div>
                ) : userList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400">No {modalType} found.</div>
                ) : (
                  <ListBox aria-label="Users list" selectionMode="none" className="w-full flex flex-col gap-1">
                    {userList.map((u) => (
                      <ListBox.Item 
                        key={u.$id || u.user_id} 
                        id={u.$id || u.user_id} 
                        textValue={u.name || u.handle}
                        className="cursor-pointer hover:bg-neutral-100 rounded-xl p-2.5 transition-colors flex items-center gap-3 outline-none"
                        onAction={() => {
                          setModalOpen(false);
                          router.push(`/${u.handle}`);
                        }}
                      >
                        <Avatar size="sm" className="w-9 h-9 shrink-0 rounded-full overflow-hidden border border-neutral-200">
                          <Avatar.Image
                            alt={u.name || u.handle}
                            src={u.avatar_url || ""}
                            className="object-cover w-full h-full"
                          />
                          <Avatar.Fallback>{(u.handle || "U").charAt(0).toUpperCase()}</Avatar.Fallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <Label className="font-bold text-xs text-neutral-900 truncate">{u.name || u.handle}</Label>
                          <Description className="text-[11px] text-neutral-500 truncate">@{u.handle}</Description>
                        </div>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                )}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </main>
  );
}