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
import { Book, Plus, Edit2, MessageSquare, FileText, Menu, X, Heart, Send, Trash2, Users, MessageSquarePlus, Lock, Eye } from "lucide-react";
import ChapterContent from "@/components/ChapterContent";
import HoverCard from "@/components/HoverCard";

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
  const [collaboratorProfiles, setCollaboratorProfiles] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"root" | "chapter">("root");
  const [selectedChapter, setSelectedChapter] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [likeId, setLikeId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  
  // Discussion & Annotations System
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [selectedTextQuote, setSelectedTextQuote] = useState("");
  const [annotationMenuPos, setAnnotationMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [flashedCommentId, setFlashedCommentId] = useState<string | null>(null);
  
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentElementsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const loadData = async () => {
    try {
      const nb = await getNotebook(notebookId);
      const ch = await getChaptersForNotebook(notebookId);
      setNotebook(nb);
      setChapters(ch);

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
      
      const ownerCheck = !!user && user.$id === nb.owner_id;
      const editorCheck = !!user && (user.$id === nb.owner_id || (nb.collaborator_ids && nb.collaborator_ids.includes(user.$id)));
      
      setIsOwner(ownerCheck);
      setCanEdit(editorCheck);
      setAuthorProfile(author);

      if (nb.collaborator_ids && nb.collaborator_ids.length > 0) {
        const profiles = await Promise.all(
          nb.collaborator_ids.map((id: string) => getPingByUserId(id).catch(() => null))
        );
        setCollaboratorProfiles(profiles.filter(Boolean));
      }
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
      setSelectedTextQuote("");
      setAnnotationMenuPos(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedChapter]);

  // Track text selections precisely at the fine block element layer
  const handleSelectionTracking = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setAnnotationMenuPos(null);
      return;
    }

    const text = selection.toString().trim();
    
    // Ensure we are reading nodes strictly locked within our container context
    if (contentWrapperRef.current && contentWrapperRef.current.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      
      // Secondary boundary safety check to prevent accidental jumping selections
      const startContainer = range.startContainer.parentElement;
      const endContainer = range.endContainer.parentElement;
      
      if (startContainer && endContainer) {
        const rect = range.getBoundingClientRect();
        
        setAnnotationMenuPos({
          top: rect.top + window.scrollY - 46, // Aligns popover perfectly right over text line
          left: rect.left + window.scrollX + rect.width / 2,
        });
        setSelectedTextQuote(text);
      }
    }
  };

  useEffect(() => {
    document.addEventListener("mouseup", handleSelectionTracking);
    document.addEventListener("keyup", handleSelectionTracking);
    return () => {
      document.removeEventListener("mouseup", handleSelectionTracking);
      document.removeEventListener("keyup", handleSelectionTracking);
    };
  }, []);

  const triggerAnnotationDraft = () => {
    setAnnotationMenuPos(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleNewChapter = async () => {
    if (!canEdit) return; 
    setCreating(true);
    try {
      const nextOrder = chapters.length;
      const chapter = await createChapter(
        notebookId,
        currentUser.$id, 
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
      router.push("/signup");
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

        try {
          await notifyLike(
            notebook.owner_id,
            currentUser.$id,
            currentUserProfile?.name || "",
            currentUserProfile?.handle || "anonymous",
            selectedChapter.$id
          );
        } catch (err) {
          console.error(err);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLikeLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!currentUser) {
      router.push("/signup");
      return;
    }
    if (!newComment.trim()) return;

    setPostingComment(true);
    
    const prefixScope = isPrivateNote ? "[private:true]" : "[private:false]";
    const quotePayload = selectedTextQuote ? `[quote:${selectedTextQuote}]` : "";
    const totalPayload = `${prefixScope}${quotePayload} ${newComment.trim()}`;

    try {
      const comment = await createComment(
        selectedChapter.$id,
        currentUser.$id,
        currentUserProfile?.handle || "anonymous",
        totalPayload,
        currentUserProfile?.name || "",
        currentUserProfile?.avatar_url || ""
      );
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
      setSelectedTextQuote("");
      setIsPrivateNote(false);

      try {
        await notifyComment(
          notebook.owner_id,
          currentUser.$id,
          currentUserProfile?.name || "",
          currentUserProfile?.handle || "anonymous",
          selectedChapter.$id
        );
      } catch (err) {
        console.error(err);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.$id !== commentId));
    } catch (err) {
      console.error(err);
    }
  };

  const parseAnnotationMeta = (rawStr: string) => {
    let text = rawStr || "";
    let isPrivate = false;
    let quote: string | null = null;

    if (text.startsWith("[private:true]")) {
      isPrivate = true;
      text = text.replace("[private:true]", "");
    } else if (text.startsWith("[private:false]")) {
      text = text.replace("[private:false]", "");
    }

    const quoteMatch = text.match(/^\[quote:(.*?)\]\s([\s\S]*)$/);
    if (quoteMatch) {
      quote = quoteMatch[1];
      text = quoteMatch[2];
    }

    return { isPrivate, quote, bodyText: text.trim() };
  };

  const jumpToCommentSection = (commentId: string) => {
    setFlashedCommentId(commentId);
    const target = commentElementsRef.current[commentId];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => setFlashedCommentId(null), 2000);
  };

  if (loading) return <NotebookPageSkeleton />;
  if (!notebook) return <div className="p-8 text-sm text-neutral-500">Notebook repository not found.</div>;

  const currentTitle = viewMode === "chapter" && selectedChapter ? selectedChapter.title : notebook.title;

  const visibleComments = comments.filter((c) => {
    const { isPrivate } = parseAnnotationMeta(c.content);
    if (!isPrivate) return true;
    return canEdit || (currentUser && currentUser.$id === c.user_id);
  });

  const AuthorByline = () => {
    if (!authorProfile) return null;
    return (
      <HoverCard handle={authorProfile.handle}>
        <a
          href={`/${authorProfile.handle}`}
          className="flex items-center gap-2 text-xs text-neutral-500 font-medium hover:text-neutral-900 transition w-fit"
        >
          <div className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[9px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden">
            {authorProfile?.avatar_url ? (
              <img src={authorProfile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              authorProfile?.handle?.charAt(0) || "?"
            )}
          </div>
          <span>{authorProfile?.name || `@${authorProfile?.handle}`}</span>
        </a>
      </HoverCard>
    );
  };

  const CollaborationStack = () => {
    if (collaboratorProfiles.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-400 font-medium">
        <Users className="w-3 h-3 text-neutral-400" />
        <span>with</span>
        {collaboratorProfiles.map((collab, index) => (
          <span key={collab.$id} className="text-neutral-600 font-medium flex items-center">
            <HoverCard handle={collab.handle}>
              <a 
                href={`/${collab.handle}`} 
                className="hover:text-neutral-900 hover:underline transition"
              >
                {collab.name || `@${collab.handle}`}
              </a>
            </HoverCard>
            {index < collaboratorProfiles.length - 1 && <span className="mr-1">,</span>}
          </span>
        ))}
      </div>
    );
  };

  return (
    <main className="w-full min-h-[calc(100vh-56px)] h-[calc(100vh-56px)] bg-white text-neutral-900 overflow-hidden flex relative">

      {/* Medium Popover Context Trigger */}
      {annotationMenuPos && (
        <button
          style={{ top: annotationMenuPos.top, left: annotationMenuPos.left }}
          onClick={triggerAnnotationDraft}
          className="absolute z-50 -translate-x-1/2 bg-neutral-950 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-xl flex items-center gap-1.5 hover:bg-neutral-900 transition animate-in fade-in zoom-in-95 duration-100 border border-neutral-800"
        >
          <MessageSquarePlus className="w-3.5 h-3.5 text-green-400" />
          <span>Annotate</span>
        </button>
      )}

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

          {canEdit && (
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

                  {canEdit && (
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
                <div className="flex flex-col gap-1.5">
                  <AuthorByline />
                  <CollaborationStack />
                </div>
              </div>
            </div>
            <div className="flex-1 text-sm text-neutral-800 leading-relaxed font-normal whitespace-pre-wrap break-words">
              {notebook.description || <p className="italic text-neutral-400">No extended description yet.</p>}
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
                <div className="flex flex-col gap-1.5">
                  <AuthorByline />
                  <CollaborationStack />
                </div>
              </div>
            </div>

            {/* Document Body Wrapper with Selection Overrides */}
            <div 
              className="flex-1 relative selection:bg-green-100/90 selection:text-neutral-900" 
              ref={contentWrapperRef}
            >
              <div className="prose prose-neutral max-w-none text-neutral-800 tracking-normal leading-relaxed">
                <ChapterContent contentJson={selectedChapter.content_json} />
              </div>
              
              {/* Side Margin Annotations Tracker */}
              <div className="absolute top-0 -right-6 md:-right-12 flex flex-col gap-2 select-none h-full border-l border-neutral-100/60 pl-2">
                {visibleComments.map((c) => {
                  const { quote, isPrivate } = parseAnnotationMeta(c.content);
                  if (!quote) return null;
                  return (
                    <button
                      key={`anchor-${c.$id}`}
                      onClick={() => jumpToCommentSection(c.$id)}
                      className={`p-1.5 rounded-full border transition-all duration-200 flex items-center justify-center shadow-sm hover:scale-105 group/anchor ${
                        isPrivate 
                          ? "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100" 
                          : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      }`}
                      title={isPrivate ? "Private Note" : `Annotation: "${quote}"`}
                    >
                      {isPrivate ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <MessageSquare className="w-3 h-3 text-gray-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-16 pt-8 border-t border-neutral-200 bg-white">
              <div className="flex items-center gap-2 mb-8">
                <button
                  onClick={handleLikeToggle}
                  disabled={likeLoading}
                  className={`flex items-center gap-1.5 text-sm rounded-full px-3 py-1.5 border transition-colors ${
                    likeId ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-neutral-300 text-neutral-600 hover:border-neutral-400"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${likeId ? "fill-red-500 text-red-500" : ""}`} />
                  <span>{likeCount}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-neutral-900" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Discussions
                </h3>
                <span className="text-[10px] bg-neutral-100 text-neutral-600 font-bold px-1.5 py-0.5 rounded-full">
                  {visibleComments.length}
                </span>
              </div>

              {visibleComments.length === 0 ? (
                <div className="space-y-4 text-center py-6 border border-dashed border-neutral-100 rounded-xl bg-neutral-50/40 mb-6">
                  <p className="text-xs text-neutral-400 italic">Be the first to comment.</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {visibleComments.map((c) => {
                    const { quote, isPrivate, bodyText } = parseAnnotationMeta(c.content);
                    const isFlashed = flashedCommentId === c.$id;

                    return (
                      <div 
                        key={c.$id} 
                        ref={(el) => { commentElementsRef.current[c.$id] = el; }}
                        className={`flex gap-3 items-start group p-3 rounded-xl transition-all duration-500 border ${
                          isFlashed 
                            ? "bg-neutral-50 border-neutral-300 scale-[1.01] shadow-sm" 
                            : "bg-transparent border-transparent"
                        }`}
                      >
                        <HoverCard handle={c.handle}>
                          <div className="w-7 h-7 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden cursor-pointer">
                            {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : c.handle?.charAt(0) || "?"}
                          </div>
                        </HoverCard>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <HoverCard handle={c.handle}>
                              <span className="text-xs font-bold text-neutral-900 cursor-pointer hover:underline">
                                {c.name || `@${c.handle}`}
                              </span>
                            </HoverCard>
                            
                            {isPrivate && (
                              <span className="flex items-center gap-1 text-[9px] bg-purple-50 text-purple-700 font-semibold px-1.5 py-0.5 rounded border border-purple-100 uppercase tracking-wide select-none">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Private Note</span>
                              </span>
                            )}
                          </div>

                          {quote && (
                            <div className="mt-1.5 text-[11px] bg-green-50/40 text-neutral-700 border border-green-150 rounded-md p-2 mb-1.5 font-medium border-l-2 border-l-green-400 max-w-full">
                              <span className="italic">"{quote}"</span>
                            </div>
                          )}

                          <p className="text-xs text-neutral-700 mt-1 leading-relaxed">{bodyText}</p>
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
                    );
                  })}
                </div>
              )}

              {/* Input Area */}
              <div className="flex gap-3 items-start py-4">
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden">
                  {currentUserProfile?.avatar_url ? <img src={currentUserProfile.avatar_url} alt="" className="w-full h-full object-cover" /> : currentUserProfile?.handle?.charAt(0) || "U"}
                </div>
                <div className="flex-1 space-y-2">
                  
                  {selectedTextQuote && (
                    <div className="flex items-center justify-between gap-4 bg-black-50/40 border border-green-200/60 rounded-lg px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 text-neutral-600 truncate">
                        <MessageSquarePlus className="w-3.5 h-3.5 text-black/50 shrink-0" />
                        <span className="italic truncate text-neutral-700 font-medium">
                          Annotating selection: "{selectedTextQuote}"
                        </span>
                      </div>
                      <button onClick={() => setSelectedTextQuote("")} className="p-1 rounded hover:bg-black text-neutral-400 hover:text-neutral-700 transition">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={currentUser ? "Write a public response or leave an annotated feedback note..." : "Log in to post annotations"}
                    disabled={!currentUser}
                    className="w-full p-2.5 min-h-[80px] rounded-lg border border-neutral-200 text-xs focus:outline-none focus:border-neutral-400 resize-none placeholder:text-neutral-400 transition disabled:opacity-50"
                  />
                  
                  <div className="flex items-center justify-between">
                    {currentUser ? (
                      <button
                        type="button"
                        onClick={() => setIsPrivateNote(!isPrivateNote)}
                        className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition ${
                          isPrivateNote 
                            ? "bg-gray border-purple-200 text-black shadow-sm" 
                            : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                        }`}
                      >
                        {isPrivateNote ? <Lock className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{isPrivateNote ? "Private comment" : "Public Comment"}</span>
                      </button>
                    ) : <div />}

                    <button
                      onClick={handlePostComment}
                      disabled={postingComment || !newComment.trim()}
                      className="h-7 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      {postingComment ? "Submitting..." : "Respond"}
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