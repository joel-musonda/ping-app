"use client";

import { useEffect, useState, useRef } from "react";
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
  updateNotebookVisibility,
  deleteNotebookCascade
} from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";
import { Query } from "appwrite";
import { 
  Book, MapPin, Users, FileText, Lock, Globe, MoreVertical, 
  Edit3, PlusCircle, Globe2, Trash2, Link as LinkIcon, Pin, AlertCircle, Check,
  GitFork, Flag
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Modal, Avatar, ListBox, Label, Description } from "@heroui/react";

function ProfileSkeleton() {
  return (
    <div className="flex flex-col space-y-4 animate-pulse">
      <div className="w-32 h-32 md:w-40 md:h-40 bg-neutral-100 dark:bg-neutral-800 rounded-full shrink-0" />
      <div className="space-y-2">
        <div className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded w-3/4" />
        <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-1/2" />
      </div>
      <div className="h-9 bg-neutral-100 dark:bg-neutral-800 rounded-md w-full" />
      <div className="space-y-2 pt-2">
        <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-full" />
        <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-5/6" />
      </div>
      <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-2/3 pt-1" />
      <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-1/2" />
        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-2/3" />
      </div>
    </div>
  );
}

function NotebookSkeleton() {
  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-3 bg-white dark:bg-neutral-900 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 w-2/3">
          <div className="w-4 h-4 bg-neutral-100 dark:bg-neutral-800 rounded shrink-0" />
          <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-full" />
        </div>
        <div className="w-3.5 h-3.5 bg-neutral-100 dark:bg-neutral-800 rounded shrink-0" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-full" />
        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-4/5" />
      </div>
      <div className="flex gap-2 pt-1">
        <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-12" />
        <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-24" />
      </div>
    </div>
  );
}

export default function PingProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();
  const [ping, setPing] = useState<any>(null);
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  const [activityMap, setActivityMap] = useState<Map<string, "notebook" | "chapter">>(new Map());

  // Modal State for Followers & Following Lists
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"followers" | "following">("followers");
  const [userList, setUserList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // Dropdown & Dialog States for Notebook Actions
  const [openMenuNotebookId, setOpenMenuNotebookId] = useState<string | null>(null);
  const [visibilityModalNotebook, setVisibilityModalNotebook] = useState<any | null>(null);
  const [deleteModalNotebook, setDeleteModalNotebook] = useState<any | null>(null);
  const [copyModalUrl, setCopyModalUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load local pinned notebooks storage for current viewer
    try {
      const savedPins = localStorage.getItem(`pinned_notebooks_${handle}`);
      if (savedPins) {
        setPinnedIds(JSON.parse(savedPins));
      }
    } catch (e) {
      console.error(e);
    }
  }, [handle]);

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

        const newActivityMap = new Map<string, "notebook" | "chapter">();
        
        nbs.forEach((nb: any) => {
          const chapters = nb.chapters || nb.chapterList || nb.items || [];
          if (Array.isArray(chapters) && chapters.length > 0) {
            chapters.forEach((ch: any) => {
              const chDate = ch.$createdAt || ch.created_at;
              if (chDate) {
                const dateStr = chDate.split("T")[0];
                if (!newActivityMap.has(dateStr)) {
                  newActivityMap.set(dateStr, "chapter");
                }
              }
            });
          }

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

  // Close dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuNotebookId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleTogglePin = (nbId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let updatedPins = [...pinnedIds];
    if (updatedPins.includes(nbId)) {
      updatedPins = updatedPins.filter((id) => id !== nbId);
    } else {
      if (updatedPins.length >= 4) {
        alert("You can only pin up to 4 notebooks.");
        return;
      }
      updatedPins.push(nbId);
    }
    setPinnedIds(updatedPins);
    try {
      localStorage.setItem(`pinned_notebooks_${handle}`, JSON.stringify(updatedPins));
    } catch (err) {
      console.error(err);
    }
    setOpenMenuNotebookId(null);
  };

  const handleOpenCopyModal = (nbId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/notebooks/${nbId}`;
    setCopyModalUrl(url);
    setOpenMenuNotebookId(null);
  };

  const executeCopyLink = () => {
    if (!copyModalUrl) return;
    navigator.clipboard.writeText(copyModalUrl);
    setCopyModalUrl(null);
    setToastMessage("Link copied successfully");
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const confirmToggleVisibility = async () => {
    if (!visibilityModalNotebook) return;
    const nb = visibilityModalNotebook;
    const nextState = !nb.is_public;
    try {
      await updateNotebookVisibility(nb.$id, nextState);
      setNotebooks((prev) =>
        prev.map((item) => (item.$id === nb.$id ? { ...item, is_public: nextState } : item))
      );
    } catch (err) {
      console.error("Failed to change visibility:", err);
    } finally {
      setVisibilityModalNotebook(null);
    }
  };

  const confirmDeleteNotebook = async () => {
    if (!deleteModalNotebook) return;
    const nb = deleteModalNotebook;
    try {
      await deleteNotebookCascade(nb.$id);
      setNotebooks((prev) => prev.filter((item) => item.$id !== nb.$id));
    } catch (err) {
      console.error("Failed to delete notebook:", err);
    } finally {
      setDeleteModalNotebook(null);
    }
  };

  // Sort notebooks: Pinned ones first (max 4), followed by unpinned
  const sortedNotebooks = [...notebooks].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.$id);
    const bPinned = pinnedIds.includes(b.$id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  if (!loading && !ping) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white dark:bg-neutral-950 text-center p-4">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Ping Not Found</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">The Username @{handle} does not exist.</p>
      </div>
    );
  }

  return (
    <main className="max-w-6xl w-full mx-auto px-4 md:px-6 py-4 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 md:h-[calc(100vh-65px)] md:overflow-hidden relative">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 h-full">

        {/* Left Profile Sidebar */}
        <div className="col-span-1 flex flex-col space-y-4 md:overflow-y-auto md:pr-2 h-full pb-4 md:pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <ProfileSkeleton />
          ) : (
            <>
              <div className="w-32 h-32 md:w-40 md:h-40 bg-neutral-100 dark:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-800 overflow-hidden flex items-center justify-center shrink-0 shadow-sm relative">
                {ping?.avatar_url ? (
                  <img
                    src={ping.avatar_url}
                    alt={`${ping?.name || handle}'s avatar`}
                    className="w-full h-full object-cover rounded-full"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <span className="text-4xl md:text-5xl font-bold text-neutral-300 dark:text-neutral-600 uppercase select-none">
                    {handle?.charAt(0)}
                  </span>
                )}
              </div>

              <div className="space-y-0.5 shrink-0">
                <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 leading-tight">
                  {ping?.name || handle}
                </h2>
                <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">@{ping?.handle}</p>
              </div>

              {isOwnProfile ? (
                <button
                  onClick={() => router.push("/settings")}
                  className="w-full bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm font-medium py-2 px-4 rounded-md shadow-sm transition-colors shrink-0 cursor-pointer"
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  onClick={handleFollowToggle}
                  disabled={actionLoading}
                  className={`w-full text-sm font-medium py-2 px-4 rounded-md shadow-sm transition-colors shrink-0 ${
                    followId
                      ? "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700"
                      : "bg-[#0084FF] hover:bg-[#0073e6] text-white"
                  }`}
                >
                  {actionLoading ? "Processing..." : followId ? "Unfollow" : "Follow"}
                </button>
              )}

              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed pt-1 shrink-0 break-words whitespace-pre-wrap">
                {ping?.bio || "Hello There, Welcome to my Ping"}
              </p>

              <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400 pt-1 shrink-0">
                <div 
                  onClick={() => handleOpenModal("followers")}
                  className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{followerCount}</span>
                  <span>followers</span>
                </div>
                <span>·</span>
                <div 
                  onClick={() => handleOpenModal("following")}
                  className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
                >
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{followingCount}</span>
                  <span>following</span>
                </div>
              </div>

              {ping?.location || ping?.website || ping?.github || ping?.twitter ? (
                <div className="space-y-2 pt-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
                  {ping?.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <span>{ping.location}</span>
                    </div>
                  )}
                  {ping?.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <a
                        href={ping.website.startsWith("http") ? ping.website : `https://${ping.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-900 dark:text-neutral-100 hover:underline break-all"
                      >
                        {ping.website}
                      </a>
                    </div>
                  )}
                  {ping?.github && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <a
                        href={ping.github.startsWith("http") ? ping.github : `https://${ping.github.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-900 dark:text-neutral-100 hover:underline break-all"
                      >
                        {ping.github.includes("github.com") ? ping.github.split("github.com/")[1] : ping.github}
                      </a>
                    </div>
                  )}
                  {ping?.twitter && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                      <a
                        href={ping.twitter.startsWith("http") ? ping.twitter : `https://${ping.twitter.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-900 dark:text-neutral-100 hover:underline break-all"
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
            <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Your Notebooks</h3>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NotebookSkeleton />
                <NotebookSkeleton />
                <NotebookSkeleton />
                <NotebookSkeleton />
              </div>
            ) : notebooks.length === 0 ? (
              <div className="border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
                <Book className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">No notebooks available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sortedNotebooks.map((nb) => {
                  const createdDate = nb.$createdAt
                    ? new Date(nb.$createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Recently";

                  const isPinned = pinnedIds.includes(nb.$id);
                  const isMenuOpen = openMenuNotebookId === nb.$id;
                  const notebookSnapshot = nb.snapshot || nb.description || "No snapshot available for this notebook yet.";

                  return (
                    <div key={nb.$id} className="relative group">
                      <a href={`/notebooks/${nb.$id}`} className="block h-full">
                        <Card className={`h-full border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all duration-200 rounded-xl relative ${isPinned ? 'ring-1 ring-[#0084FF]/40 border-[#0084FF]/50 bg-blue-50/10 dark:bg-blue-950/10' : ''}`}>
                          <CardHeader className="p-4 flex flex-col justify-between h-full space-y-3">
                            <div className="space-y-1 pr-6">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {isPinned && <Pin className="w-3.5 h-3.5 text-[#0084FF] fill-[#0084FF] shrink-0 rotate-45" />}
                                  <Book className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
                                  <CardTitle className="text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 underline-offset-2 decoration-1">
                                    {nb.title}
                                  </CardTitle>
                                </div>
                                {!nb.is_public && <Lock className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />}
                              </div>
                              <CardDescription className="text-xs text-neutral-600 dark:text-neutral-400 font-normal line-clamp-2 pt-0.5 leading-relaxed">
                                {notebookSnapshot}
                              </CardDescription>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500 pt-1">
                              <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 font-semibold text-[9px]">
                                {nb.is_public ? "Public" : "Private"}
                              </span>
                              <span>• Created {createdDate}</span>
                            </div>
                          </CardHeader>
                        </Card>
                      </a>

                      {/* Top-Right Options Dot Menu */}
                      <div 
                        className={`absolute top-3.5 right-3.5 z-20 md:opacity-0 md:group-hover:opacity-100 transition-opacity ${isMenuOpen ? 'md:opacity-100' : ''}`}
                        ref={isMenuOpen ? menuRef : null}
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuNotebookId(isMenuOpen ? null : nb.$id);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-800 shadow-sm"
                          title="Notebook options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 mt-1 w-52 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-1.5 z-30 animate-in fade-in slide-in-from-top-1 text-xs text-neutral-800 dark:text-neutral-200">
                            {isOwnProfile ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenMenuNotebookId(null);
                                    router.push(`/notebooks/${nb.$id}/edit`);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left text-neutral-700 dark:text-neutral-300 font-medium"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                                  <span>Edit notebook</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenMenuNotebookId(null);
                                    router.push(`/notebooks/${nb.$id}/chapters/new`);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left text-neutral-700 dark:text-neutral-300 font-medium"
                                >
                                  <PlusCircle className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                                  <span>Add a chapter</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenMenuNotebookId(null);
                                    setVisibilityModalNotebook(nb);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left text-neutral-700 dark:text-neutral-300 font-medium"
                                >
                                  <Globe2 className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                                  <span>Make {nb.is_public ? "private" : "public"}</span>
                                </button>

                                <button
                                  onClick={(e) => handleOpenCopyModal(nb.$id, e)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left text-neutral-700 dark:text-neutral-300 font-medium"
                                >
                                  <LinkIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                                  <span>Copy link</span>
                                </button>

                                <button
                                  onClick={(e) => handleTogglePin(nb.$id, e)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left text-neutral-700 dark:text-neutral-300 font-medium border-t border-neutral-100 dark:border-neutral-800 mt-0.5 pt-2"
                                >
                                  <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-[#0084FF] fill-[#0084FF]' : 'text-neutral-400 dark:text-neutral-500'}`} />
                                  <span>{isPinned ? "Unpin notebook" : "Pin notebook"}</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenMenuNotebookId(null);
                                    setDeleteModalNotebook(nb);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-left text-red-600 font-medium border-t border-neutral-100 dark:border-neutral-800 mt-0.5 pt-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  <span>Delete notebook</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => handleOpenCopyModal(nb.$id, e)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left text-neutral-700 dark:text-neutral-300 font-medium"
                                >
                                  <LinkIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                                  <span>Copy link</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenMenuNotebookId(null);
                                    setToastMessage("Fork functionality coming soon");
                                    setTimeout(() => setToastMessage(null), 3000);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left text-neutral-700 dark:text-neutral-300 font-medium"
                                >
                                  <GitFork className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                                  <span>Fork notebook</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenMenuNotebookId(null);
                                    setToastMessage("Notebook reported successfully");
                                    setTimeout(() => setToastMessage(null), 3000);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-left text-red-600 font-medium border-t border-neutral-100 dark:border-neutral-800 mt-0.5 pt-2"
                                >
                                  <Flag className="w-3.5 h-3.5 text-red-500" />
                                  <span>Report notebook</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity Streak Matrix Panel */}
          <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Activity</h3>
            </div>

            <div className="flex items-center gap-6 text-xs font-bold text-neutral-400 dark:text-neutral-500 border-b border-b-neutral-100 dark:border-b-neutral-800 pb-2">
              <div className="flex items-center gap-1.5 text-neutral-900 dark:text-neutral-100 border-b-2 border-b-neutral-900 dark:border-b-neutral-100 pb-2 -mb-[9px] cursor-pointer">
                <FileText className="w-3.5 h-3.5" />
                <span>Notebooks streak</span>
              </div>
            </div> 

            <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-x-auto [scrollbar-width:thin]">
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
                        activityType,
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
                      <div className="flex relative h-4 mb-0.5 text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
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
                              className="h-2.5 text-[9px] text-neutral-400 dark:text-neutral-500 font-medium flex items-center justify-start leading-none"
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
                                if (typeof window !== "undefined" && document.documentElement.classList.contains("dark")) {
                                  bg = "#27272A";
                                }
                                if (!loading && !day.isFuture) {
                                  if (day.activityType === "notebook") {
                                    bg = "#3B82F6";
                                  } else if (day.activityType === "chapter") {
                                    bg = "#93C5FD";
                                  }
                                }

                                return (
                                  <span
                                    key={dayIdx}
                                    title={`${day.dateStr}: ${day.activityType ? day.activityType + ' created' : 'No activity'}`}
                                    className="w-2.5 h-2.5 rounded-[1.5px] block shrink-0 transition-colors bg-neutral-100 dark:bg-neutral-800"
                                    style={{ backgroundColor: !loading && !day.isFuture && day.activityType ? (day.activityType === "notebook" ? "#3B82F6" : "#93C5FD") : undefined }}
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

      {/* Visibility Toggle Alert Dialog */}
      {visibilityModalNotebook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100">
            <div className="flex flex-col items-start gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-[#0084FF] shadow-sm">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Make notebook {visibilityModalNotebook.is_public ? "private" : "public"}?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  {visibilityModalNotebook.is_public
                    ? "Setting this notebook to private will hide it from public feeds and community members."
                    : "Setting this notebook to public will allow anyone on Ping to view its contents and chapters."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setVisibilityModalNotebook(null)}
                className="px-4 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleVisibility}
                className="px-4 py-2.5 rounded-full bg-[#0084FF] hover:bg-[#0073e6] text-white text-xs font-semibold shadow-md transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteModalNotebook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100">
            <div className="flex flex-col items-start gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 flex items-center justify-center text-red-600 shadow-sm">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Delete notebook?</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-neutral-800 dark:text-neutral-200">&ldquo;{deleteModalNotebook.title}&rdquo;</span>? This action cannot be undone and all chapters will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteModalNotebook(null)}
                className="px-4 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteNotebook}
                className="px-4 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Link Confirmation Modal */}
      {copyModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100">
            <div className="flex flex-col items-start gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-[#0084FF] shadow-sm">
                <LinkIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Copy notebook link</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  Would you like to copy the direct link to your clipboard so you can share it with others?
                </p>
                <div className="mt-3 p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-[11px] text-neutral-600 dark:text-neutral-300 break-all font-mono">
                  {copyModalUrl}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setCopyModalUrl(null)}
                className="px-4 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeCopyLink}
                className="px-4 py-2.5 rounded-full bg-[#0084FF] hover:bg-[#0073e6] text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification for Link Copied */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-3 rounded-2xl shadow-xl text-xs font-medium animate-in slide-in-from-bottom-5 duration-200">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HeroUI Followers / Following Modal */}
      <Modal isOpen={modalOpen} onOpenChange={setModalOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[400px] dark:bg-neutral-900 dark:border dark:border-neutral-800 dark:text-neutral-100">
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
                        className="cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl p-2.5 transition-colors flex items-center gap-3 outline-none"
                        onAction={() => {
                          setModalOpen(false);
                          router.push(`/${u.handle}`);
                        }}
                      >
                        <Avatar size="sm" className="w-9 h-9 shrink-0 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700">
                          <Avatar.Image
                            alt={u.name || u.handle}
                            src={u.avatar_url || ""}
                            className="object-cover w-full h-full"
                          />
                          <Avatar.Fallback>{(u.handle || "U").charAt(0).toUpperCase()}</Avatar.Fallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <Label className="font-bold text-xs text-neutral-900 dark:text-neutral-100 truncate">{u.name || u.handle}</Label>
                          <Description className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">@{u.handle}</Description>
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