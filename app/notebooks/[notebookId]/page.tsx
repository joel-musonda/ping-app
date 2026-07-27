"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getNotebook, getChaptersForNotebook, createChapter, deleteChapter,
  checkIsLiked, getLikeCount, likeChapter, unlikeChapter,
  createComment, getCommentsForChapter, deleteComment, getPingByUserId,
  notifyLike, notifyComment,
} from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";
import { 
  BookOpen, Plus, Edit2, MessageSquare, FileText, Menu, X, Heart, 
  Send, Trash2, Users, MessageSquarePlus, Lock, Eye, CheckCircle2, ArrowRight, CornerDownRight, Reply
} from "lucide-react";
import { ScrollShadow } from "@heroui/react";
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
        <div className="space-y-3">
          <div className="h-16 bg-neutral-100 rounded-xl w-full" />
          <div className="h-16 bg-neutral-100 rounded-xl w-full" />
        </div>
      </div>
      <div className="flex-1 px-6 md:px-12 py-10 max-w-3xl mx-auto w-full animate-pulse">
        <div className="h-7 bg-neutral-200 rounded w-2/3 mb-3" />
        <div className="h-3 bg-neutral-200 rounded w-32 mb-8" />
        <div className="space-y-3">
          <div className="h-32 bg-neutral-100 rounded-xl w-full" />
          <div className="h-32 bg-neutral-100 rounded-xl w-full" />
        </div>
      </div>
    </main>
  );
}

interface HeadingItem {
  id: string;
  text: string;
  level: number;
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
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [selectedTextQuote, setSelectedTextQuote] = useState("");
  const [annotationMenuPos, setAnnotationMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [flashedCommentId, setFlashedCommentId] = useState<string | null>(null);

  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>("");

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [postingReply, setPostingReply] = useState(false);
  
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentSectionRef = useRef<HTMLDivElement>(null);
  const commentElementsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const loadData = async () => {
    try {
      const nb = await getNotebook(notebookId);
      const ch = await getChaptersForNotebook(notebookId);
      setNotebook(nb);
      setChapters(ch);

      const [user, author] = await Promise.all([
        getCurrentUser(),
        getPingByUserId(nb.owner_id),
      ]);
      
      const ownerCheck = !!user && user.$id === nb.owner_id;
      const editorCheck = !!user && (user.$id === nb.owner_id || (nb.collaborator_ids && nb.collaborator_ids.includes(user.$id)));
      
      setIsOwner(ownerCheck);
      setCanEdit(editorCheck);
      setAuthorProfile(author);
      setCurrentUser(user);

      if (user) {
        const profile = await getPingByUserId(user.$id);
        setCurrentUserProfile(profile);
      }

      if (nb.collaborator_ids && nb.collaborator_ids.length > 0) {
        const profiles = await Promise.all(
          nb.collaborator_ids.map((id: string) => getPingByUserId(id).catch(() => null))
        );
        setCollaboratorProfiles(profiles.filter(Boolean));
      }

      if (ch.length > 0) {
        setSelectedChapter(ch[0]);
        setViewMode("chapter");
      } else {
        setViewMode("root");
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
    if (!notebook) return;
    const title = selectedChapter ? `${selectedChapter.title} — ${notebook.title}` : notebook.title;
    const description = notebook.snapshot || notebook.description || "Read this notebook on Nzelu AI.";
    const image = selectedChapter?.preview_image_url || notebook.preview_image_url || "";

    document.title = title;

    const updateOrCreateMeta = (property: string, content: string) => {
      if (!content) return;
      let tag = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        if (property.startsWith("og:") || property.startsWith("twitter:")) {
          tag.setAttribute("property", property);
        } else {
          tag.setAttribute("name", property);
        }
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    updateOrCreateMeta("og:title", title);
    updateOrCreateMeta("og:description", description);
    if (image) updateOrCreateMeta("og:image", image);
    updateOrCreateMeta("twitter:card", "summary_large_image");
    updateOrCreateMeta("twitter:title", title);
    updateOrCreateMeta("twitter:description", description);
    if (image) updateOrCreateMeta("twitter:image", image);
  }, [notebook, selectedChapter]);

  useEffect(() => {
    if (!selectedChapter) return;
    let cancelled = false;

    (async () => {
      const [count, likedId, chapterComments] = await Promise.all([
        getLikeCount(selectedChapter.$id),
        currentUser ? checkIsLiked(currentUser.$id, selectedChapter.$id) : Promise.resolve(null),
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
  }, [selectedChapter, currentUser]);

  // Stable Table of Contents extraction
  useEffect(() => {
    if (viewMode !== "chapter" || !selectedChapter || !contentWrapperRef.current) {
      setHeadings([]);
      return;
    }

    const timer = setTimeout(() => {
      if (!contentWrapperRef.current) return;
      
      let headingEls = Array.from(contentWrapperRef.current.querySelectorAll("h1, h2, h3, h4"));
      
      if (headingEls.length === 0) {
        const paragraphs = Array.from(contentWrapperRef.current.querySelectorAll("p"));
        const validParagraphs = paragraphs.filter(p => (p.textContent || "").trim().length > 15);
        if (validParagraphs.length > 0) {
          headingEls = validParagraphs.filter((_, idx) => idx === 0 || idx % Math.max(1, Math.floor(validParagraphs.length / 4)) === 0);
        } else {
          headingEls = paragraphs;
        }
      }

      const items: HeadingItem[] = headingEls.map((el, index) => {
        if (!el.id) {
          el.id = `toc-section-${index}`;
        }
        const level = el.tagName === "P" ? 2 : parseInt(el.tagName.replace("H", ""), 10);
        const textContent = el.textContent || `Section ${index + 1}`;
        return {
          id: el.id,
          text: textContent.length > 45 ? textContent.slice(0, 45) + "..." : textContent,
          level: isNaN(level) ? 2 : level,
        };
      });

      setHeadings(items);
      if (items.length > 0 && !activeHeadingId) {
        setActiveHeadingId(items[0].id);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [selectedChapter, viewMode]);

  // Precise scroll tracking using offsetTop
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || viewMode !== "chapter" || headings.length === 0) return;

    const handleScroll = () => {
      setAnnotationMenuPos(null);

      const scrollPos = container.scrollTop + 140;
      let currentActive = headings[0].id;

      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el) {
          if (el.offsetTop <= scrollPos) {
            currentActive = h.id;
          }
        }
      }

      if (currentActive) {
        setActiveHeadingId(currentActive);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [viewMode, headings]);

  // Text selection tracking
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setAnnotationMenuPos(null);
        return;
      }

      if (contentWrapperRef.current && contentWrapperRef.current.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setAnnotationMenuPos({
          top: rect.top - 46,
          left: rect.left + rect.width / 2,
        });
        setSelectedTextQuote(selection.toString().trim());
      } else {
        setAnnotationMenuPos(null);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  const scrollToHeading = (headingId: string) => {
    setActiveHeadingId(headingId);
    const el = document.getElementById(headingId);
    const container = scrollContainerRef.current;
    if (el && container) {
      const offsetTop = el.offsetTop - 24;
      container.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    } else if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const triggerAnnotationDraft = () => {
    setAnnotationMenuPos(null);
    if (commentSectionRef.current) {
      commentSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
    if (textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
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

  const handleDeleteChapter = async (chapterId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!canEdit) return;
    if (!window.confirm("Are you sure you want to delete this chapter?")) return;

    try {
      await deleteChapter(chapterId);
      const updatedChapters = chapters.filter((c) => c.$id !== chapterId);
      setChapters(updatedChapters);
      if (selectedChapter?.$id === chapterId) {
        if (updatedChapters.length > 0) {
          setSelectedChapter(updatedChapters[0]);
          setViewMode("chapter");
        } else {
          setViewMode("root");
          setSelectedChapter(null);
        }
      }
      showToast("Chapter deleted successfully");
    } catch (err) {
      console.error("Failed to delete chapter:", err);
      alert("Could not delete chapter.");
    }
  };

  const handleSelectChapter = (ch: any) => {
    setSelectedChapter(ch);
    setViewMode("chapter");
    setSidebarOpen(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNotebookClick = () => {
    if (chapters.length > 0) {
      handleSelectChapter(chapters[0]);
    } else {
      setViewMode("root");
    }
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
            notebook.owner_id, currentUser.$id, currentUserProfile?.name || "",
            currentUserProfile?.handle || "anonymous", selectedChapter.$id
          );
        } catch (err) { console.error(err); }
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
        selectedChapter.$id, currentUser.$id, currentUserProfile?.handle || "anonymous",
        totalPayload, currentUserProfile?.name || "", currentUserProfile?.avatar_url || ""
      );
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
      setSelectedTextQuote("");
      setIsPrivateNote(false);
      showToast("Comment sent successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setPostingComment(false);
    }
  };

  const handlePostReply = async (parentCommentId: string) => {
    if (!currentUser) {
      router.push("/signup");
      return;
    }
    if (!replyText.trim()) return;

    setPostingReply(true);
    const replyPayload = `[reply:${parentCommentId}] ${replyText.trim()}`;

    try {
      const comment = await createComment(
        selectedChapter.$id, currentUser.$id, currentUserProfile?.handle || "anonymous",
        replyPayload, currentUserProfile?.name || "", currentUserProfile?.avatar_url || ""
      );
      setComments((prev) => [comment, ...prev]);
      setReplyText("");
      setReplyingToId(null);
      showToast("Reply sent successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setPostingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.$id !== commentId && parseAnnotationMeta(c.content).replyToId !== commentId));
      showToast("Comment deleted");
    } catch (err) {
      console.error(err);
    }
  };

  const parseAnnotationMeta = (rawStr: string) => {
    let text = rawStr || "";
    let isPrivate = false;
    let quote: string | null = null;
    let replyToId: string | null = null;

    if (text.startsWith("[private:true]")) {
      isPrivate = true;
      text = text.replace("[private:true]", "");
    } else if (text.startsWith("[private:false]")) {
      text = text.replace("[private:false]", "");
    }

    const replyMatch = text.match(/^\[reply:(.*?)\]\s/);
    if (replyMatch) {
      replyToId = replyMatch[1];
      text = text.replace(replyMatch[0], "");
    }

    const quoteMatch = text.match(/^\[quote:(.*?)\]\s([\s\S]*)$/);
    if (quoteMatch) {
      quote = quoteMatch[1];
      text = quoteMatch[2];
    }

    return { isPrivate, quote, replyToId, bodyText: text.trim() };
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

  const topLevelComments = visibleComments.filter((c) => !parseAnnotationMeta(c.content).replyToId);
  const getRepliesForComment = (commentId: string) => {
    return visibleComments.filter((c) => parseAnnotationMeta(c.content).replyToId === commentId);
  };

  const AuthorByline = () => {
    if (!authorProfile) return null;
    return (
      <HoverCard handle={authorProfile.handle}>
        <a href={`/${authorProfile.handle}`} className="flex items-center gap-2 text-xs text-neutral-500 font-medium hover:text-neutral-900 transition w-fit">
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
              <a href={`/${collab.handle}`} className="hover:text-neutral-900 hover:underline transition">
                {collab.name || `@${collab.handle}`}
              </a>
            </HoverCard>
            {index < collaboratorProfiles.length - 1 && <span className="mr-1">,</span>}
          </span>
        ))}
      </div>
    );
  };

  const currentChapterIndex = chapters.findIndex(c => c.$id === selectedChapter?.$id);
  const nextChapter = currentChapterIndex !== -1 && currentChapterIndex < chapters.length - 1 ? chapters[currentChapterIndex + 1] : null;

  return (
    <main className="w-full min-h-[calc(100vh-56px)] h-[calc(100vh-56px)] bg-white text-neutral-900 overflow-hidden flex relative">

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-950 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200 border border-neutral-800">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Medium Popover Context Trigger */}
      {annotationMenuPos && (
        <button
          style={{ top: annotationMenuPos.top, left: annotationMenuPos.left }}
          onClick={triggerAnnotationDraft}
          className="fixed z-[9999] -translate-x-1/2 bg-neutral-950 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-xl flex items-center gap-1.5 hover:bg-neutral-900 transition animate-in fade-in zoom-in-95 duration-100 border border-neutral-800"
        >
          <MessageSquarePlus className="w-3.5 h-3.5 text-green-400" />
          <span>Annotate</span>
        </button>
      )}

      {/* Progress Indicator Dashes with Table of Contents Hover Popover Card */}
      {viewMode === "chapter" && headings.length > 0 && (
        <div className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-40 items-center">
          <div className="relative group/toc py-4 px-2">
            {/* Table of Contents Popover Card on Hover */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover/toc:opacity-100 group-hover/toc:pointer-events-auto transition-all duration-200 w-72 bg-white rounded-2xl shadow-xl border border-neutral-200 p-4 z-50 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                {headings.map((h) => {
                  const isActive = h.id === activeHeadingId;
                  const indentClass = h.level === 3 ? "pl-4 text-[11px]" : h.level >= 4 ? "pl-8 text-[11px]" : "text-xs";
                  return (
                    <button
                      key={`toc-popover-${h.id}`}
                      onClick={() => scrollToHeading(h.id)}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-all flex items-center gap-2.5 ${indentClass} ${isActive ? "text-green-600 font-semibold bg-green-50/60" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"}`}
                    >
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
                      <span className="truncate">{h.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dash Bar Stack */}
            <div className="flex flex-col items-center gap-2 py-3 px-1.5 rounded-full hover:bg-neutral-100/70 transition-colors cursor-pointer">
              {headings.map((h) => {
                const isActive = h.id === activeHeadingId;
                return (
                  <button
                    key={h.id}
                    onClick={() => scrollToHeading(h.id)}
                    className={`h-0.5 rounded-full transition-all duration-200 ${isActive ? "bg-neutral-900 h-1.5 w-5 shadow-xs" : "bg-neutral-300 hover:bg-neutral-400 w-4"}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-12 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
        <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1.5 rounded-md text-neutral-600 hover:bg-neutral-100 transition">
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-neutral-900 truncate">{currentTitle}</span>
      </div>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="md:hidden fixed inset-0 bg-neutral-950/40 z-40" />}

      <div
        className={`fixed md:static top-0 left-0 h-full w-80 max-w-[85vw] border-r border-neutral-200 flex flex-col bg-white md:bg-neutral-50/50 shrink-0 z-50 transition-transform duration-200 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="md:hidden flex justify-end p-3 shrink-0">
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div onClick={handleNotebookClick} className={`p-5 border-b border-neutral-200/80 cursor-pointer transition-colors group/hero shrink-0 ${viewMode === "root" || (selectedChapter && chapters[0]?.$id === selectedChapter.$id) ? "bg-white" : "bg-transparent hover:bg-neutral-100/40"}`}>
          <div className="flex items-center gap-2 text-neutral-400 mb-1.5">
            <BookOpen className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider group-hover/hero:text-neutral-600 transition-colors">Notebook</span>
          </div>
          <h1 className="text-base font-black tracking-tight text-neutral-900 leading-snug group-hover/hero:text-neutral-800">{notebook.title}</h1>
          <p className="text-xs text-neutral-500 font-normal italic mt-1.5 leading-relaxed line-clamp-2">
            {notebook.snapshot || notebook.description || "Click to open the first chapter."}
          </p>
          <div className="mt-4" />
          {canEdit && (
            <button onClick={(e) => { e.stopPropagation(); handleNewChapter(); }} disabled={creating} style={{ backgroundColor: "#0084FF" }} className="w-full h-8 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50 hover:opacity-90">
              <Plus className="w-3.5 h-3.5" />
              <span>{creating ? "Creating..." : "Add Chapter"}</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-3 pl-1 shrink-0">Chapters ({chapters.length})</span>
          <ScrollShadow visibility="bottom" className="flex-1 max-h-full pr-1 space-y-2">
            <nav className="space-y-2 pb-6">
              {chapters.map((ch) => {
                const isActive = viewMode === "chapter" && selectedChapter?.$id === ch.$id;
                return (
                  <div key={ch.$id} onClick={() => handleSelectChapter(ch)} className={`w-full relative group/item p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${isActive ? "bg-white text-neutral-900 border-neutral-300 shadow-sm" : "bg-white/60 hover:bg-white text-neutral-700 border-neutral-200/80 shadow-2xs hover:border-neutral-300"}`}>
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200/70 overflow-hidden flex items-center justify-center shrink-0">
                      {ch.preview_image_url ? (
                        <img src={ch.preview_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-neutral-500 flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 w-full h-full">
                          <BookOpen className="w-4 h-4 text-neutral-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-16 md:pr-10">
                      <h4 className="text-xs font-bold text-neutral-900 truncate">{ch.title || "Untitled chapter"}</h4>
                    </div>

                    {canEdit && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity bg-white md:bg-transparent md:shadow-none p-1 md:p-0 rounded-md">
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/notebooks/${notebookId}/chapters/${ch.$id}`); }} className="p-1.5 rounded-md md:bg-white md:border border-neutral-200 shadow-sm text-neutral-600 hover:text-neutral-900 transition" title="Edit Chapter">
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => handleDeleteChapter(ch.$id, e)} className="p-1.5 rounded-md md:bg-white md:border border-neutral-200 shadow-sm text-neutral-400 hover:text-rose-600 transition" title="Delete Chapter">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </ScrollShadow>
        </div>
      </div>

      <ScrollShadow ref={scrollContainerRef} visibility="bottom" className="flex-1 flex flex-col h-full bg-white overflow-y-auto pt-12 md:pt-0">
        {viewMode === "root" && (
          <div className="max-w-3xl w-full mx-auto px-6 md:px-12 pt-6 pb-24 md:pb-10 flex flex-col min-h-full">
            <div className="flex justify-between items-start gap-6 border-b border-neutral-100 pb-4 mb-6 relative">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 leading-tight">{notebook.title}</h2>
                <div className="flex flex-col gap-1.5">
                  <AuthorByline />
                  <CollaborationStack />
                </div>
              </div>
            </div>
            <div className="text-sm text-neutral-800 leading-relaxed font-normal whitespace-pre-wrap break-words mb-8">
              {notebook.description || <p className="italic text-neutral-400">No extended description yet.</p>}
            </div>
            <div className="space-y-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Chapters Index ({chapters.length})</span>
                </h3>
                {canEdit && (
                  <button onClick={handleNewChapter} disabled={creating} style={{ color: "#0084FF" }} className="text-xs font-bold hover:opacity-80 flex items-center gap-1 transition">
                    <Plus className="w-3.5 h-3.5" />
                    <span>New chapter</span>
                  </button>
                )}
              </div>
              {chapters.length === 0 ? (
                <div className="border border-dashed border-neutral-200 rounded-2xl p-8 text-center space-y-3 bg-neutral-50/50">
                  <p className="text-xs text-neutral-500 italic">No chapters published in this notebook yet.</p>
                  {canEdit && <button onClick={handleNewChapter} style={{ backgroundColor: "#0084FF" }} className="px-4 py-2 text-white rounded-lg text-xs font-semibold shadow-sm transition hover:opacity-90">Create First Chapter</button>}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {viewMode === "chapter" && selectedChapter && (
          <div className="max-w-2xl w-full mx-auto px-6 md:px-12 pt-6 pb-24 md:pb-10 flex flex-col min-h-full">
            <div className="flex justify-between items-start gap-6 border-b border-neutral-100 pb-4 mb-6 relative">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
                  <span>Chapter {currentChapterIndex + 1} of {chapters.length}</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 leading-tight">
                  {selectedChapter.title || "Untitled chapter"}
                </h2>
                <div className="flex flex-col gap-1.5">
                  <AuthorByline />
                  <CollaborationStack />
                </div>
              </div>
            </div>

            <div className="flex-1 relative selection:bg-green-100/90 selection:text-neutral-900" ref={contentWrapperRef}>
              <div className="prose prose-neutral max-w-none text-neutral-800 tracking-normal leading-relaxed">
                <ChapterContent contentJson={selectedChapter.content_json} />
              </div>
              
              <div className="absolute top-0 -right-6 md:-right-12 flex flex-col gap-2 select-none h-full border-l border-neutral-100/60 pl-2">
                {visibleComments.map((c) => {
                  const { quote, isPrivate } = parseAnnotationMeta(c.content);
                  if (!quote) return null;
                  return (
                    <button
                      key={`anchor-${c.$id}`}
                      onClick={() => jumpToCommentSection(c.$id)}
                      className={`p-1.5 rounded-full border transition-all duration-200 flex items-center justify-center shadow-sm hover:scale-105 group/anchor ${isPrivate ? "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100" : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"}`}
                      title={isPrivate ? "Private Note" : `Annotation: "${quote}"`}
                    >
                      {isPrivate ? <Lock className="w-3 h-3" /> : <MessageSquare className="w-3 h-3 text-neutral-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {nextChapter && (
              <div onClick={() => handleSelectChapter(nextChapter)} className="mt-16 p-5 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 cursor-pointer transition group flex items-center justify-between gap-4 shadow-2xs">
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Up Next Chapter</span>
                  <h4 className="text-sm font-bold text-neutral-900 group-hover:text-neutral-950 transition truncate">{nextChapter.title || "Untitled chapter"}</h4>
                </div>
                <div style={{ backgroundColor: "#0084FF" }} className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            )}

            <div ref={commentSectionRef} className="mt-12 pt-8 border-t border-neutral-200 bg-white scroll-mt-6">
              <div className="flex items-center gap-2 mb-8">
                <button onClick={handleLikeToggle} disabled={likeLoading} className={`flex items-center gap-1.5 text-sm rounded-full px-3 py-1.5 border transition-colors ${likeId ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-neutral-300 text-neutral-600 hover:border-neutral-400"}`}>
                  <Heart className={`w-4 h-4 ${likeId ? "fill-red-500 text-red-500" : ""}`} />
                  <span>{likeCount}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-4 h-4 text-neutral-900" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">Discussions</h3>
                <span className="text-[10px] bg-neutral-100 text-neutral-600 font-bold px-1.5 py-0.5 rounded-full">{visibleComments.length}</span>
              </div>

              {topLevelComments.length === 0 ? (
                <div className="space-y-4 text-center py-8 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50 mb-6">
                  <p className="text-xs text-neutral-400 italic">No discussions yet. Be the first to share your thoughts or annotation!</p>
                </div>
              ) : (
                <div className="space-y-6 mb-8">
                  {topLevelComments.map((c) => {
                    const { quote, isPrivate, bodyText } = parseAnnotationMeta(c.content);
                    const isFlashed = flashedCommentId === c.$id;
                    const replies = getRepliesForComment(c.$id);

                    return (
                      <div key={c.$id} className="space-y-3">
                        <div ref={(el) => { commentElementsRef.current[c.$id] = el; }} className={`flex gap-3 items-start group p-4 rounded-2xl transition-all duration-500 border bg-white ${isFlashed ? "border-blue-300 shadow-md ring-2 ring-blue-100" : "border-neutral-200/80 hover:border-neutral-300 shadow-2xs"}`}>
                          <HoverCard handle={c.handle}>
                            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white text-[11px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden cursor-pointer shadow-sm">
                              {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : c.handle?.charAt(0) || "?"}
                            </div>
                          </HoverCard>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                              <div className="flex items-center gap-2">
                                <HoverCard handle={c.handle}>
                                  <span className="text-xs font-bold text-neutral-900 cursor-pointer hover:underline">{c.name || `@${c.handle}`}</span>
                                </HoverCard>
                                {isPrivate && (
                                  <span className="flex items-center gap-1 text-[9px] bg-purple-50 text-purple-700 font-semibold px-1.5 py-0.5 rounded border border-purple-100 uppercase tracking-wide select-none">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Private Note</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                {currentUser && (
                                  <button onClick={() => setReplyingToId(replyingToId === c.$id ? null : c.$id)} style={{ color: "#0084FF" }} className="text-[11px] font-semibold hover:opacity-80 flex items-center gap-1 transition">
                                    <Reply className="w-3 h-3" />
                                    <span>Reply</span>
                                  </button>
                                )}
                                {currentUser?.$id === c.user_id && (
                                  <button onClick={() => handleDeleteComment(c.$id)} className="p-1 rounded text-neutral-400 hover:text-rose-600 transition" title="Delete comment">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {quote && (
                              <div className="mt-2 text-[11px] bg-green-50/50 text-neutral-800 border border-green-200/80 rounded-lg p-2.5 mb-2 font-medium border-l-2 border-l-green-500">
                                <span className="italic">"{quote}"</span>
                              </div>
                            )}

                            <p className="text-xs text-neutral-800 leading-relaxed mt-1">{bodyText}</p>
                          </div>
                        </div>

                        {replies.length > 0 && (
                          <div className="pl-6 md:pl-10 space-y-3 border-l-2 border-neutral-100 ml-4">
                            {replies.map((reply) => {
                              const replyMeta = parseAnnotationMeta(reply.content);
                              const isReplyFlashed = flashedCommentId === reply.$id;
                              return (
                                <div key={reply.$id} ref={(el) => { commentElementsRef.current[reply.$id] = el; }} className={`flex gap-3 items-start group p-3.5 rounded-xl border bg-neutral-50/60 transition-all duration-300 ${isReplyFlashed ? "border-blue-300 shadow-sm bg-blue-50/20" : "border-neutral-200/60"}`}>
                                  <HoverCard handle={reply.handle}>
                                    <div className="w-7 h-7 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden cursor-pointer">
                                      {reply.avatar_url ? <img src={reply.avatar_url} alt="" className="w-full h-full object-cover" /> : reply.handle?.charAt(0) || "?"}
                                    </div>
                                  </HoverCard>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                      <HoverCard handle={reply.handle}>
                                        <span className="text-xs font-bold text-neutral-900 cursor-pointer hover:underline">{reply.name || `@${reply.handle}`}</span>
                                      </HoverCard>
                                      {currentUser?.$id === reply.user_id && (
                                        <button onClick={() => handleDeleteComment(reply.$id)} className="p-1 rounded text-neutral-400 hover:text-rose-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition" title="Delete reply">
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-xs text-neutral-700 leading-relaxed">{replyMeta.bodyText}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {replyingToId === c.$id && (
                          <div className="pl-6 md:pl-10 ml-4 pt-1 animate-in fade-in duration-200">
                            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500">
                                <CornerDownRight className="w-3 h-3 text-[#0084FF]" />
                                <span>Replying to {c.name || `@${c.handle}`}</span>
                              </div>
                              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..." className="w-full p-2.5 min-h-[60px] rounded-lg border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#0084FF] resize-none placeholder:text-neutral-400 transition" />
                              <div className="flex items-center justify-end gap-2">
                                <button type="button" onClick={() => { setReplyingToId(null); setReplyText(""); }} className="px-2.5 py-1 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition">Cancel</button>
                                <button type="button" onClick={() => handlePostReply(c.$id)} disabled={postingReply || !replyText.trim()} style={{ backgroundColor: "#0084FF" }} className="h-7 px-3 text-white rounded-md text-xs font-medium shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90">
                                  <Send className="w-3 h-3" />
                                  {postingReply ? "Posting..." : "Reply"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3 items-start py-4 bg-neutral-50/50 p-4 rounded-2xl border border-neutral-200/80">
                <div className="w-8 h-8 rounded-full bg-neutral-900 text-white text-[11px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden shadow-sm">
                  {currentUserProfile?.avatar_url ? <img src={currentUserProfile.avatar_url} alt="" className="w-full h-full object-cover" /> : currentUserProfile?.handle?.charAt(0) || "U"}
                </div>
                <div className="flex-1 space-y-2.5">
                  {selectedTextQuote && (
                    <div className="flex items-center justify-between gap-4 bg-green-50/60 border border-green-200 rounded-lg px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 text-neutral-700 truncate">
                        <MessageSquare className="w-4 h-4 text-[#0084FF] shrink-0" />
                        <span className="italic truncate font-medium">Annotating selection: "{selectedTextQuote}"</span>
                      </div>
                      <button onClick={() => setSelectedTextQuote("")} className="p-1 rounded hover:bg-green-100 text-neutral-400 hover:text-neutral-700 transition">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <textarea ref={textareaRef} value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={currentUser ? "Write a public response or leave an annotated feedback note..." : "Log in to post annotations"} disabled={!currentUser} className="w-full p-3 min-h-[80px] rounded-xl border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#0084FF] resize-none placeholder:text-neutral-400 transition disabled:opacity-50 shadow-2xs" />
                  <div className="flex items-center justify-between">
                    {currentUser ? (
                      <button type="button" onClick={() => setIsPrivateNote(!isPrivateNote)} className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition ${isPrivateNote ? "bg-purple-50 border-purple-200 text-purple-700 shadow-sm" : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
                        {isPrivateNote ? <Lock className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{isPrivateNote ? "Private comment" : "Public Comment"}</span>
                      </button>
                    ) : <div />}
                    <button onClick={handlePostComment} disabled={postingComment || !newComment.trim()} style={{ backgroundColor: "#0084FF" }} className="h-8 px-4 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90">
                      <Send className="w-3.5 h-3.5" />
                      {postingComment ? "Submitting..." : "Respond"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </ScrollShadow>
    </main>
  );
}
