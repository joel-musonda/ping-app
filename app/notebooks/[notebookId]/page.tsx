"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getNotebook, getChaptersForNotebook, createChapter,
  checkIsLiked, getLikeCount, likeChapter, unlikeChapter,
  createComment, getCommentsForChapter, deleteComment, getPingByUserId,
  notifyLike, notifyComment,
} from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";
import { Book, Plus, MoreVertical, Edit2, MessageSquare, Clock, FileText, Globe, Menu, X, Heart, Send, Trash2 } from "lucide-react";
import ChapterContent from "@/components/ChapterContent";

function NotebookPageSkeleton() {
  return (
    <main className="w-full min-h-[calc(100vh-56px)] h-[calc(100vh-56px)] bg-white flex overflow-hidden">
      <div className="hidden md:flex w-80 border-r border-neutral-200 flex-col h-full bg-neutral-50/50 shrink-0 p-5 animate-pulse">
        <div className="h-3 bg-neutral-200 rounded w-24 mb-3" />
        <div className="h-5 bg-neutral-200 rounded w-full mb-2" />
        <div className="h-3 bg-neutral-200 rounded w-3/4 mb-4" />
        <div className="h-8 bg-neutral-200 rounded w-full mb-6" />
        <div className="h-3 bg-neutral-200 rounded w-20 mb-3" />
        <div className="space-y-2">
          <div className="h-8 bg-neutral-100 rounded w-full" />
          <div className="h-8 bg-neutral-100 rounded w-full" />
          <div className="h-8 bg-neutral-100 rounded w-full" />
        </div>
      </div>
      <div className="flex-1 px-6 md:px-12 py-10 max-w-2xl mx-auto w-full animate-pulse">
        <div className="h-7 bg-neutral-200 rounded w-2/3 mb-3" />
        <div className="h-3 bg-neutral-200 rounded w-32 mb-8" />
        <div className="space-y-2">
          <div className="h-3 bg-neutral-100 rounded w-full" />
          <div className="h-3 bg-neutral-100 rounded w-full" />
          <div className="h-3 bg-neutral-100 rounded w-5/6" />
          <div className="h-3 bg-neutral-100 rounded w-full" />
          <div className="h-3 bg-neutral-100 rounded w-2/3" />
        </div>
      </div>
    </main>
  );
}

export default function NotebookPage() {
  const { notebookId } = useParams<{ notebookId: string }>();
  const router = useRouter();

  const [notebook, setNotebook] = useState<any>(null);
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"root" | "chapter">("root");
  const [selectedChapter, setSelectedChapter] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [likeId, setLikeId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const loadData = async () => {
    try {
      const nb = await getNotebook(notebookId);
      const ch = await getChaptersForNotebook(notebookId);
      setNotebook(nb);
      setChapters(ch);

      // Default to the first chapter if one exists, instead of the empty overview
      if (ch.length > 0) {
        setSelectedChapter(ch[0]);
        setViewMode("chapter");
      } else {
        setViewMode("root");
      }

      const [user, author] = await Promise.all([
        getCurrentUser(),
        getPingByUserId(nb.owner_id),
      ]);
      setIsOwner(!!user && user.$id === nb.owner_id);
      setAuthorProfile(author);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [notebookId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedChapter) return;
    let cancelled = false;

    (async () => {
      const user = await getCurrentUser();
      if (cancelled) return;
      setCurrentUser(user);

      if (user) {
        const profile = await getPingByUserId(user.$id);
        if (!cancelled) setCurrentUserProfile(profile);
      }

      const [count, likedId, chapterComments] = await Promise.all([
        getLikeCount(selectedChapter.$id),
        user ? checkIsLiked(user.$id, selectedChapter.$id) : Promise.resolve(null),
        getCommentsForChapter(selectedChapter.$id),
      ]);

      if (cancelled) return;
      setLikeCount(count);
      setLikeId(likedId);
      setComments(chapterComments);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedChapter]);

  const handleNewChapter = async () => {
    if (!isOwner) return;
    setCreating(true);
    try {
      const nextOrder = chapters.length;
      const chapter = await createChapter(
        notebookId,
        notebook.owner_id,
        notebook.is_public,
        "Untitled chapter",
        "",
        nextOrder
      );
      router.push(`/notebooks/${notebookId}/chapters/${chapter.$id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleSelectChapter = (ch: any) => {
    setSelectedChapter(ch);
    setViewMode("chapter");
    setSidebarOpen(false);
  };

  const handleSelectRoot = () => {
    setViewMode("root");
    setSidebarOpen(false);
  };

 const handleLikeToggle = async () => {
  if (!currentUser) {
    router.push("/login");
    return;
  }
  setLikeLoading(true);
  try {
    if (likeId) {
      await unlikeChapter(likeId);
      setLikeId(null);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      const newLike = await likeChapter(currentUser.$id, selectedChapter.$id);
      setLikeId(newLike.$id);
      setLikeCount((c) => c + 1);

      // Notify the notebook owner, but don't let a notification failure break the like itself
      try {
        await notifyLike(
          notebook.owner_id,
          currentUser.$id,
          currentUserProfile?.name || "",
          currentUserProfile?.handle || "anonymous",
          selectedChapter.$id
        );
      } catch (err) {
        console.error("Failed to send like notification:", err);
      }
    }
  } catch (err) {
    console.error("Failed to toggle like:", err);
  } finally {
    setLikeLoading(false);
  }
};

  

const handlePostComment = async () => {
  if (!currentUser) {
    router.push("/login");
    return;
  }
  if (!newComment.trim()) return;

  setPostingComment(true);
  try {
    const comment = await createComment(
      selectedChapter.$id,
      currentUser.$id,
      currentUserProfile?.handle || "anonymous",
      newComment.trim(),
      currentUserProfile?.name || "",
      currentUserProfile?.avatar_url || ""
    );
    setComments((prev) => [comment, ...prev]);
    setNewComment("");

    try {
      await notifyComment(
        notebook.owner_id,
        currentUser.$id,
        currentUserProfile?.name || "",
        currentUserProfile?.handle || "anonymous",
        selectedChapter.$id
      );
    } catch (err) {
      console.error("Failed to send comment notification:", err);
    }
  } catch (err) {
    console.error("Failed to post comment:", err);
  } finally {
    setPostingComment(false);
  }
};

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.$id !== commentId));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  if (loading) return <NotebookPageSkeleton />;
  if (!notebook) return <div className="p-8 text-sm text-neutral-500">Notebook repository not found.</div>;

  const currentTitle = viewMode === "chapter" && selectedChapter ? selectedChapter.title : notebook.title;

  const AuthorByline = () => (
    <a
      href={authorProfile ? `/${authorProfile.handle}` : "#"}
      className="flex items-center gap-2 text-xs text-neutral-500 font-medium hover:text-neutral-900 transition w-fit"
    >
      <div className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[9px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden">
        {authorProfile?.avatar_url ? (
          <img src={authorProfile.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          authorProfile?.handle?.charAt(0) || "?"
        )}
      </div>
      <span>{authorProfile?.name || `@${authorProfile?.handle || "unknown"}`}</span>
    </a>
  );

  return (
    <main className="w-full min-h-[calc(100vh-56px)] h-[calc(100vh-56px)] bg-white text-neutral-900 overflow-hidden flex relative">

      <div className="md:hidden absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-12 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 -ml-1.5 rounded-md text-neutral-600 hover:bg-neutral-100 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-neutral-900 truncate">{currentTitle}</span>
      </div>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-neutral-950/40 z-40"
        />
      )}

      <div
        className={`
          fixed md:static top-0 left-0 h-full w-80 max-w-[85vw] border-r border-neutral-200
          flex flex-col bg-white md:bg-neutral-50/50 shrink-0 overflow-y-auto z-50
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          transition-transform duration-200 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        `}
      >
        <div className="md:hidden flex justify-end p-3">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          onClick={handleSelectRoot}
          className={`p-5 border-b border-neutral-200/80 cursor-pointer transition-colors group/hero shrink-0 ${
            viewMode === "root" ? "bg-white" : "bg-transparent hover:bg-neutral-100/40"
          }`}
        >
          <div className="flex items-center gap-2 text-neutral-400 mb-1.5">
            <Book className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider group-hover/hero:text-neutral-600 transition-colors">
              Notebook Overview
            </span>
          </div>

          <h1 className="text-base font-black tracking-tight text-neutral-900 leading-snug group-hover/hero:text-neutral-800">
            {notebook.title}
          </h1>

          <p className="text-xs text-neutral-500 font-normal italic mt-1.5 leading-relaxed line-clamp-3">
            {notebook.snapshot || notebook.description || "Click to read the primary introduction of this repository."}
          </p>

          <div className="mt-4" />

          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNewChapter();
              }}
              disabled={creating}
              className="w-full h-8 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{creating ? "Creating..." : "Add Chapter"}</span>
            </button>
          )}
        </div>

        <div className="p-4 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2 pl-1">
            Chapters Index
          </span>

          <nav className="space-y-0.5">
            {chapters.map((ch) => {
              const isActive = viewMode === "chapter" && selectedChapter?.$id === ch.$id;
              return (
                <div key={ch.$id} className="w-full relative group/item">
                  <button
                    onClick={() => handleSelectChapter(ch)}
                    className={`w-full text-left pl-3 pr-10 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                      isActive
                        ? "bg-white text-neutral-900 border border-neutral-200 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/70"
                    }`}
                  >
                    <FileText className={`w-3.5 h-3.5 ${isActive ? "text-neutral-900" : "text-neutral-400"}`} />
                    <span className="truncate flex-1">{ch.title || "Untitled chapter"}</span>
                  </button>

                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/notebooks/${notebookId}/chapters/${ch.$id}`);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded bg-white border border-neutral-200 shadow-sm text-neutral-400 hover:text-neutral-900 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150"
                      title="Edit Chapter"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {chapters.length === 0 && (
              <p className="text-xs text-neutral-400 italic p-2">No chapters published yet.</p>
            )}
          </nav>
        </div>

      </div>

      <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-12 md:pt-0">

        {viewMode === "root" && (
          <div className="max-w-2xl w-full mx-auto px-6 md:px-12 pt-6 pb-24 md:pb-10 flex flex-col min-h-full">
            <div className="flex justify-between items-start gap-6 border-b border-neutral-100 pb-4 mb-6 relative">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 leading-tight">
                  {notebook.title}
                </h2>
                <AuthorByline />
                <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Main Repository Overview</span>
                </div>
              </div>
            </div>

            <div className="flex-1 text-sm text-neutral-800 leading-relaxed font-normal whitespace-pre-wrap break-words">
              {notebook.description || (
                <p className="italic text-neutral-400">This notebook does not have an extended overview description yet.</p>
              )}
            </div>
          </div>
        )}

        {viewMode === "chapter" && selectedChapter && (
          <div className="max-w-2xl w-full mx-auto px-6 md:px-12 pt-6 pb-24 md:pb-10 flex flex-col min-h-full">

            <div className="flex justify-between items-start gap-6 border-b border-neutral-100 pb-4 mb-6 relative">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 leading-tight">
                  {selectedChapter.title || "Untitled chapter"}
                </h2>
                <AuthorByline />
                <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {selectedChapter.$createdAt
                      ? new Date(selectedChapter.$createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                      : "Draft stage"}
                  </span>
                </div>
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-1 w-40 rounded-lg border border-neutral-200 bg-white shadow-lg py-1 z-20 animate-in fade-in slide-in-from-top-1 duration-100">
                    {isOwner ? (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          router.push(`/notebooks/${notebookId}/chapters/${selectedChapter.$id}`);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 transition font-medium"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Edit Chapter</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigator.clipboard.writeText(window.location.href);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 transition font-medium"
                      >
                        <span>Copy Link</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1">
              <ChapterContent contentJson={selectedChapter.content_json} />
            </div>

            <div className="mt-16 pt-8 border-t border-neutral-200 bg-white">

              <div className="flex items-center gap-2 mb-8">
                <button
                  onClick={handleLikeToggle}
                  disabled={likeLoading}
                  className={`flex items-center gap-1.5 text-sm rounded-full px-3 py-1.5 border transition-colors ${
                    likeId
                      ? "bg-red-50 border-red-200 text-red-600"
                      : "bg-white border-neutral-300 text-neutral-600 hover:border-neutral-400"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${likeId ? "fill-red-500 text-red-500" : ""}`} />
                  <span>{likeCount}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-neutral-900" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Discussion Feed
                </h3>
                <span className="text-[10px] bg-neutral-100 text-neutral-600 font-bold px-1.5 py-0.5 rounded-full">
                  {comments.length}
                </span>
              </div>

              {comments.length === 0 ? (
                <div className="space-y-4 text-center py-6 border border-dashed border-neutral-100 rounded-xl bg-neutral-50/40 mb-6">
                  <p className="text-xs text-neutral-400 italic">No responses written for this section yet.</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {comments.map((c) => (
                    <div key={c.$id} className="flex gap-3 items-start group">
                      <div className="w-7 h-7 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          c.handle?.charAt(0) || "?"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900">{c.name || `@${c.handle}`}</span>
                          <span className="text-[10px] text-neutral-400">@{c.handle}</span>
                        </div>
                        <p className="text-xs text-neutral-700 mt-0.5">{c.content}</p>
                      </div>
                      {currentUser?.$id === c.user_id && (
                        <button
                          onClick={() => handleDeleteComment(c.$id)}
                          className="p-1 rounded text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition shrink-0"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 items-start py-15">
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden">
                  {currentUserProfile?.avatar_url ? (
                    <img src={currentUserProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    currentUserProfile?.handle?.charAt(0) || "U"
                  )}
                </div>
                <div className="flex-1 space-y-2 py-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={currentUser ? "Write a response or feedback snippet..." : "Log in to comment"}
                    disabled={!currentUser}
                    className="w-full p-2.5 min-h-[72px] rounded-lg border border-neutral-200 text-xs focus:outline-none focus:border-neutral-400 resize-none placeholder:text-neutral-400 transition disabled:opacity-50"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handlePostComment}
                      disabled={postingComment || !newComment.trim()}
                      className="h-7 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3 h-3 " />
                      {postingComment ? "Posting..." : "Respond"}
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

    </main>
  );
}