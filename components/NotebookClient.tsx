"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getNotebook, getChaptersForNotebook, createChapter, deleteChapter,
  checkIsLiked, getLikeCount, likeChapter, unlikeChapter,
  createComment, getCommentsForChapter, deleteComment, getPingByUserId,
  notifyLike, notifyComment,
} from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";
import { 
  BookOpen, Plus, Edit2, MessageSquare, FileText, Menu, X, ThumbsUp, 
  Send, Trash2, Users, MessageSquarePlus, Lock, Eye, CheckCircle2, ArrowRight, CornerDownRight, Reply, AlertTriangle
} from "lucide-react";
import ChapterContent from "@/components/ChapterContent";
import HoverCard from "@/components/HoverCard";

function NotebookPageSkeleton() {
  return (
    <main className="w-full max-w-full overflow-x-hidden min-h-[calc(100vh-56px)] bg-white dark:bg-neutral-950 flex">
      <div className="hidden md:flex w-80 border-r border-neutral-200 dark:border-neutral-800 flex-col h-[calc(100vh-56px)] sticky top-14 bg-neutral-50/50 dark:bg-neutral-900/50 shrink-0 p-5 animate-pulse">
        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-24 mb-3" />
        <div className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded w-full mb-2" />
        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4 mb-4" />
        <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-full mb-6" />
        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-20 mb-3" />
        <div className="space-y-3">
          <div className="h-16 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl w-full" />
          <div className="h-16 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl w-full" />
        </div>
      </div>
      <div className="flex-1 px-6 md:px-12 py-10 max-w-3xl mx-auto w-full animate-pulse">
        <div className="h-7 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3 mb-3" />
        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-32 mb-8" />
        <div className="space-y-3">
          <div className="h-32 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl w-full" />
          <div className="h-32 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl w-full" />
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
  const [isGlobalNavVisible, setIsGlobalNavVisible] = useState(true);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [likeId, setLikeId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [likerProfiles, setLikerProfiles] = useState<any[]>([]);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [selectedTextQuote, setSelectedTextQuote] = useState("");
  const [annotationMenuPos, setAnnotationMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [flashedCommentId, setFlashedCommentId] = useState<string | null>(null);

  const [itemToDelete, setItemToDelete] = useState<{ type: "chapter" | "comment"; id: string } | null>(null);

  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>("");

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [postingReply, setPostingReply] = useState(false);

  const [, startTransition] = useTransition();
  const lastScrollY = useRef(0);
  
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentSectionRef = useRef<HTMLDivElement>(null);
  const commentElementsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [nb, ch, user] = await Promise.all([
          getNotebook(notebookId),
          getChaptersForNotebook(notebookId),
          getCurrentUser(),
        ]);

        if (!isMounted) return;
        setNotebook(nb);
        setChapters(ch);
        setCurrentUser(user);

        if (ch.length > 0) {
          setSelectedChapter(ch[0]);
          setViewMode("chapter");
        } else {
          setViewMode("root");
        }
        setLoading(false);

        Promise.all([
          getPingByUserId(nb.owner_id),
          user ? getPingByUserId(user.$id) : Promise.resolve(null),
          nb.collaborator_ids && nb.collaborator_ids.length > 0
            ? Promise.all(nb.collaborator_ids.map((id: string) => getPingByUserId(id).catch(() => null)))
            : Promise.resolve([]),
        ]).then(([author, userProfile, collabs]) => {
          if (!isMounted) return;
          setAuthorProfile(author);
          if (userProfile) setCurrentUserProfile(userProfile);
          if (collabs) setCollaboratorProfiles(collabs.filter(Boolean));

          const ownerCheck = !!user && user.$id === nb.owner_id;
          const editorCheck = !!user && (user.$id === nb.owner_id || (nb.collaborator_ids && nb.collaborator_ids.includes(user.$id)));
          setIsOwner(ownerCheck);
          setCanEdit(editorCheck);
        });

      } catch (err) {
        console.error(err);
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
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

  useEffect(() => {
    const handleScroll = () => {
      setAnnotationMenuPos(null);

      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY.current) {
        setIsGlobalNavVisible(true);
        window.dispatchEvent(new CustomEvent("toggle-global-navbar", { detail: { show: true } }));
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setIsGlobalNavVisible(false);
        window.dispatchEvent(new CustomEvent("toggle-global-navbar", { detail: { show: false } }));
      }
      lastScrollY.current = currentScrollY;

      if (viewMode === "chapter" && headings.length > 0) {
        let currentActive = headings[0].id;

        for (const h of headings) {
          const el = document.getElementById(h.id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 140) {
              currentActive = h.id;
            }
          }
        }

        if (currentActive) {
          setActiveHeadingId(currentActive);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [viewMode, headings]);

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
        
        if (rect.width > 0 && rect.height > 0) {
          setAnnotationMenuPos({
            top: rect.top - 46,
            left: rect.left + rect.width / 2,
          });
          setSelectedTextQuote(selection.toString().trim());
          return;
        }
      }
      
      setAnnotationMenuPos(null);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  const scrollToHeading = (headingId: string) => {
    setActiveHeadingId(headingId);
    const el = document.getElementById(headingId);
    if (el) {
      const rect = el.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const targetTop = rect.top + scrollTop - 80;

      window.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });
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
      const chapter: any = await createChapter(
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

  const executeDeleteChapter = async (chapterId: string) => {
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
    } finally {
      setItemToDelete(null);
    }
  };

  const handleSelectChapter = (ch: any) => {
    startTransition(() => {
      setSelectedChapter(ch);
      setViewMode("chapter");
      setSidebarOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleNotebookClick = () => {
    startTransition(() => {
      if (chapters.length > 0) {
        handleSelectChapter(chapters[0]);
      } else {
        setViewMode("root");
      }
      setSidebarOpen(false);
    });
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
      router.push("/login");
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
      router.push("/login");
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

  const executeDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.$id !== commentId && parseAnnotationMeta(c.content).replyToId !== commentId));
      showToast("Comment deleted");
    } catch (err) {
      console.error(err);
    } finally {
      setItemToDelete(null);
    }
  };

  const handleLikeCommentToggle = async (comment: any) => {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    try {
      let likedBy = comment.liked_by || [];
      const userLiked = likedBy.includes(currentUser.$id);
      if (userLiked) {
        likedBy = likedBy.filter((id: string) => id !== currentUser.$id);
      } else {
        likedBy = [...likedBy, currentUser.$id];
      }

      setComments((prev) =>
        prev.map((c) => (c.$id === comment.$id ? { ...c, liked_by: likedBy } : c))
      );
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

  const calculateReadingTime = (contentJson: any) => {
    if (!contentJson) return "1 min read";
    let text = "";
    try {
      const parsed = typeof contentJson === "string" ? JSON.parse(contentJson) : contentJson;
      text = JSON.stringify(parsed).replace(/<[^>]*>?/gm, '');
    } catch {
      text = String(contentJson).replace(/<[^>]*>?/gm, '');
    }
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(words / 200);
    return `${Math.max(1, minutes)} min read`;
  };

  if (loading) return <NotebookPageSkeleton />;
  if (!notebook) return <div className="p-8 text-sm text-neutral-500 dark:text-neutral-400">Notebook repository not found.</div>;

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
        <a href={`/${authorProfile.handle}`} className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium hover:text-neutral-900 dark:hover:text-white transition w-fit">
          <div className="w-5 h-5 rounded-full bg-neutral-900 dark:bg-neutral-800 text-white text-[9px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden">
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
      <div className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-400 dark:text-neutral-500 font-medium">
        <Users className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
        <span>with</span>
        {collaboratorProfiles.map((collab, index) => (
          <span key={collab.$id} className="text-neutral-600 dark:text-neutral-300 font-medium flex items-center">
            <HoverCard handle={collab.handle}>
              <a href={`/${collab.handle}`} className="hover:text-neutral-900 dark:hover:text-white hover:underline transition">
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
    <main className="w-full max-w-full overflow-x-hidden min-h-[calc(100vh-56px)] bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex relative">

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-950 dark:bg-neutral-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200 border border-neutral-800 dark:border-neutral-700">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {annotationMenuPos && (
        <button
          style={{ top: annotationMenuPos.top, left: Math.min(annotationMenuPos.left, window.innerWidth - 80) }}
          onClick={triggerAnnotationDraft}
          className="fixed z-[9999] -translate-x-1/2 bg-neutral-950 dark:bg-neutral-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-xl flex items-center gap-1.5 hover:bg-neutral-900 dark:hover:bg-neutral-800 transition animate-in fade-in zoom-in-95 duration-100 border border-neutral-800 dark:border-neutral-700"
        >
          <MessageSquarePlus className="w-3.5 h-3.5 text-green-400" />
          <span>Annotate</span>
        </button>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                  Delete {itemToDelete.type === "chapter" ? "chapter" : "comment"}?
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (itemToDelete.type === "chapter") {
                    executeDeleteChapter(itemToDelete.id);
                  } else {
                    executeDeleteComment(itemToDelete.id);
                  }
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === "chapter" && headings.length > 0 && (
        <div className="hidden lg:flex fixed right-3 top-1/2 -translate-y-1/2 z-40 items-center">
          <div className="relative group/toc py-4 px-2">
            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover/toc:opacity-100 group-hover/toc:pointer-events-auto transition-all duration-200 w-64 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-4 z-50 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                {headings.map((h) => {
                  const isActive = h.id === activeHeadingId;
                  const indentClass = h.level === 3 ? "pl-4 text-[11px]" : h.level >= 4 ? "pl-8 text-[11px]" : "text-xs";
                  return (
                    <button
                      key={`toc-popover-${h.id}`}
                      onClick={() => scrollToHeading(h.id)}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-all flex items-center gap-2.5 ${indentClass} ${isActive ? "text-green-600 dark:text-green-400 font-semibold bg-green-50/60 dark:bg-green-950/40" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}
                    >
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
                      <span className="truncate">{h.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 py-3 px-1.5 rounded-full hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer">
              {headings.map((h) => {
                const isActive = h.id === activeHeadingId;
                return (
                  <button
                    key={h.id}
                    onClick={() => scrollToHeading(h.id)}
                    className={`h-0.5 rounded-full transition-all duration-200 ${isActive ? "bg-neutral-900 dark:bg-white h-1.5 w-5 shadow-xs" : "bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-600 w-4"}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className={`md:hidden fixed left-0 right-0 z-30 flex items-center gap-3 px-4 h-12 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md shadow-xs transition-all duration-300 ${isGlobalNavVisible ? "top-14" : "top-0"}`}>
        <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{currentTitle}</span>
      </div>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="md:hidden fixed inset-0 bg-neutral-950/40 z-40" />}

      <aside
        className={`fixed top-0 md:top-14 h-screen md:h-[calc(100vh-56px)] w-80 max-w-[85vw] border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-white dark:bg-neutral-900 md:bg-neutral-50/50 dark:md:bg-neutral-900 shrink-0 z-50 transition-transform duration-200 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 overflow-y-auto`}
      >
        <div className="md:hidden flex justify-end p-3 shrink-0">
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div onClick={handleNotebookClick} className={`p-5 border-b border-neutral-200/80 dark:border-neutral-800 cursor-pointer transition-colors group/hero shrink-0 ${viewMode === "root" || (selectedChapter && chapters[0]?.$id === selectedChapter.$id) ? "bg-white dark:bg-neutral-900" : "bg-transparent hover:bg-neutral-100/40 dark:hover:bg-neutral-800/40"}`}>
          <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500 mb-1.5">
            <BookOpen className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider group-hover/hero:text-neutral-600 dark:group-hover/hero:text-neutral-300 transition-colors">Notebook</span>
          </div>
          <h1 className="text-base font-black tracking-tight text-neutral-900 dark:text-white leading-snug group-hover/hero:text-neutral-800 dark:group-hover/hero:text-neutral-200">{notebook.title}</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal italic mt-1.5 leading-relaxed line-clamp-2">
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

        <div className="flex-1 flex flex-col p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-3 pl-1 shrink-0">Chapters ({chapters.length})</span>
          <nav className="space-y-2 pb-6">
            {chapters.map((ch) => {
              const isActive = viewMode === "chapter" && selectedChapter?.$id === ch.$id;
              return (
                <div key={ch.$id} onClick={() => handleSelectChapter(ch)} className={`w-full relative group/item p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${isActive ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border-neutral-300 dark:border-neutral-700 shadow-sm" : "bg-white/60 dark:bg-neutral-900/60 hover:bg-white dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700"}`}>
                  <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700 overflow-hidden flex items-center justify-center shrink-0">
                    {ch.preview_image_url ? (
                      <img src={ch.preview_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-neutral-500 dark:text-neutral-400 flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 w-full h-full">
                        <BookOpen className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-16 md:pr-10">
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate">{ch.title || "Untitled chapter"}</h4>
                  </div>

                  {canEdit && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity bg-white dark:bg-neutral-800 md:bg-transparent md:dark:bg-transparent md:shadow-none p-1 md:p-0 rounded-md">
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/notebooks/${notebookId}/chapters/${ch.$id}`); }} className="p-1.5 rounded-md md:bg-white md:dark:bg-neutral-800 md:border border-neutral-200 dark:border-neutral-700 shadow-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition" title="Edit Chapter">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setItemToDelete({ type: "chapter", id: ch.$id }); }} className="p-1.5 rounded-md md:bg-white md:dark:bg-neutral-800 md:border border-neutral-200 dark:border-neutral-700 shadow-sm text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition" title="Delete Chapter">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className={`flex-1 min-w-0 flex flex-col bg-white dark:bg-neutral-950 transition-all duration-300 md:pl-80 relative shadow-[inset_0_-24px_24px_-16px_rgba(0,0,0,0.03)] ${isGlobalNavVisible ? "pt-14 md:pt-0" : "pt-0"}`}>
        {viewMode === "root" && (
          <div className="max-w-3xl w-full mx-auto px-6 md:px-12 pt-6 pb-24 md:pb-10 flex flex-col min-h-full">
            <div className="flex justify-between items-start gap-6 border-b border-neutral-100 dark:border-neutral-800 pb-4 mb-6 relative">
              <div className="space-y-2 min-w-0">
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white leading-tight truncate">{notebook.title}</h2>
                <div className="flex flex-col gap-1.5">
                  <AuthorByline />
                  <CollaborationStack />
                </div>
              </div>
            </div>
            <div className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal whitespace-pre-wrap break-words mb-8">
              {notebook.description || <p className="italic text-neutral-400">No extended description yet.</p>}
            </div>
            <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
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
                <div className="border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center space-y-3 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">No chapters published in this notebook yet.</p>
                  {canEdit && <button onClick={handleNewChapter} style={{ backgroundColor: "#0084FF" }} className="px-4 py-2 text-white rounded-lg text-xs font-semibold shadow-sm transition hover:opacity-90">Create First Chapter</button>}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {viewMode === "chapter" && selectedChapter && (
          <div className="max-w-2xl w-full mx-auto px-6 md:px-12 pt-6 pb-24 md:pb-10 flex flex-col min-h-full relative">
            <div className="flex justify-between items-start gap-6 border-b border-neutral-100 dark:border-neutral-800 pb-4 mb-6 relative">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
                  <span>Chapter {currentChapterIndex + 1} of {chapters.length}</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
                  {selectedChapter.title || "Untitled chapter"}
                </h2>
                
                <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                  {selectedChapter.$createdAt && (
                    <span>{new Date(selectedChapter.$createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  )}
                  {selectedChapter.$updatedAt && selectedChapter.$updatedAt !== selectedChapter.$createdAt && (
                    <span className="text-neutral-400 dark:text-neutral-500">Last updated {new Date(selectedChapter.$updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  )}
                  <span>{calculateReadingTime(selectedChapter.content_json)}</span>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <AuthorByline />
                  <CollaborationStack />
                </div>
              </div>
            </div>

            <div className="flex-1 relative selection:bg-green-100 dark:selection:bg-green-950 selection:text-neutral-900 dark:selection:text-neutral-100 pb-12 shadow-[inset_0_-40px_30px_-20px_rgba(255,255,255,0.9)] dark:shadow-[inset_0_-40px_30px_-20px_rgba(10,10,10,0.9)]" ref={contentWrapperRef}>
             <div className="prose prose-lg prose-neutral dark:prose-invert dark:text-neutral-100 max-w-none text-neutral-900 dark:text-neutral-100 tracking-normal leading-relaxed break-words">
  <ChapterContent contentJson={selectedChapter.content_json} />
</div>
              
              <div className="absolute top-0 -right-5 md:-right-8 flex flex-col gap-2 select-none h-full border-l border-neutral-100/60 dark:border-neutral-800/60 pl-1.5">
                {visibleComments.map((c) => {
                  const { quote, isPrivate } = parseAnnotationMeta(c.content);
                  if (!quote) return null;
                  return (
                    <button
                      key={`anchor-${c.$id}`}
                      onClick={() => jumpToCommentSection(c.$id)}
                      className={`p-1.5 rounded-full border transition-all duration-200 flex items-center justify-center shadow-sm hover:scale-105 group/anchor ${isPrivate ? "bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900" : "bg-green-50 dark:bg-green-950/60 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900"}`}
                      title={isPrivate ? "Private Note" : `Annotation: "${quote}"`}
                    >
                      {isPrivate ? <Lock className="w-3 h-3" /> : <MessageSquare className="w-3 h-3 text-neutral-600 dark:text-neutral-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {nextChapter && (
              <div onClick={() => handleSelectChapter(nextChapter)} className="mt-16 p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-800 cursor-pointer transition group flex items-center justify-between gap-4 shadow-2xs">
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Up Next Chapter</span>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-neutral-950 dark:group-hover:text-neutral-200 transition truncate">{nextChapter.title || "Untitled chapter"}</h4>
                </div>
                <div style={{ backgroundColor: "#0084FF" }} className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            )}

            <div ref={commentSectionRef} className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 scroll-mt-20">
              
              <div className="flex items-center gap-3 mb-8">
                <div className="flex items-center">
                  <button
                    onClick={handleLikeToggle}
                    disabled={likeLoading}
                    className={`flex items-center gap-2.5 text-xs font-semibold rounded-full px-4 py-2 border transition-all shadow-2xs ${
                      likeId
                        ? "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-[#0084FF]"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700"
                    }`}
                  >
                    {likerProfiles.length > 0 && (
                      <div className="flex items-center -space-x-1.5 mr-0.5">
                        {likerProfiles.slice(0, 3).map((liker, idx) => (
                          <div
                            key={liker?.$id || idx}
                            className="w-5 h-5 rounded-full bg-neutral-900 dark:bg-neutral-800 text-white text-[9px] font-bold flex items-center justify-center uppercase overflow-hidden border-2 border-white dark:border-neutral-900 shrink-0"
                          >
                            {liker?.avatar_url ? (
                              <img src={liker.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              liker?.handle?.charAt(0) || "?"
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <ThumbsUp className={`w-4 h-4 ${likeId ? "fill-[#0084FF]" : ""}`} />
                    <span>{likeCount}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-4 h-4 text-neutral-900 dark:text-white" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">Discussions</h3>
                <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold px-1.5 py-0.5 rounded-full">{visibleComments.length}</span>
              </div>

              {topLevelComments.length === 0 ? (
                <div className="space-y-4 text-center py-8 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/50 mb-6">
                  <p className="text-xs text-neutral-400 italic">No discussions yet. Be the first to share your thoughts or annotation!</p>
                </div>
              ) : (
                <div className="space-y-6 mb-8">
                  {topLevelComments.map((c) => {
                    const { quote, isPrivate, bodyText } = parseAnnotationMeta(c.content);
                    const isFlashed = flashedCommentId === c.$id;
                    const replies = getRepliesForComment(c.$id);
                    const commentLiked = currentUser && (c.liked_by || []).includes(currentUser.$id);
                    const likedByList: string[] = c.liked_by || [];

                    return (
                      <div key={c.$id} className="space-y-3">
                        <div ref={(el) => { commentElementsRef.current[c.$id] = el; }} className={`flex gap-3 items-start group/card p-4 rounded-2xl transition-all duration-500 border bg-white dark:bg-neutral-900 ${isFlashed ? "border-blue-300 dark:border-blue-700 shadow-md ring-2 ring-blue-100 dark:ring-blue-950" : "border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-2xs"}`}>
                          <HoverCard handle={c.handle}>
                            <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-neutral-800 text-white text-[11px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden cursor-pointer shadow-sm">
                              {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : c.handle?.charAt(0) || "?"}
                            </div>
                          </HoverCard>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <HoverCard handle={c.handle}>
                                  <span className="text-xs font-bold text-neutral-900 dark:text-white cursor-pointer hover:underline truncate">{c.name || `@${c.handle}`}</span>
                                </HoverCard>
                                {isPrivate && (
                                  <span className="flex items-center gap-1 text-[9px] bg-purple-50 dark:bg-purple-950/65 text-purple-700 dark:text-purple-300 font-semibold px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800 uppercase tracking-wide select-none shrink-0">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Private Note</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 opacity-100 md:opacity-0 md:group-hover/card:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleLikeCommentToggle(c)}
                                  className={`flex items-center gap-1 text-[11px] font-semibold transition ${
                                    commentLiked ? "text-[#0084FF]" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                                  }`}
                                >
                                  <ThumbsUp className={`w-3.5 h-3.5 ${commentLiked ? "fill-[#0084FF]" : ""}`} />
                                  <span>{likedByList.length > 0 ? likedByList.length : "Like"}</span>
                                </button>

                                {currentUser && (
                                  <button onClick={() => setReplyingToId(replyingToId === c.$id ? null : c.$id)} style={{ color: "#0084FF" }} className="text-[11px] font-semibold hover:opacity-80 flex items-center gap-1 transition">
                                    <Reply className="w-3.5 h-3.5" />
                                    <span>Reply</span>
                                  </button>
                                )}

                                {currentUser?.$id === c.user_id && (
                                  <button onClick={() => setItemToDelete({ type: "comment", id: c.$id })} className="text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition" title="Delete comment">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {quote && (
                              <div className="mt-2 text-[11px] bg-green-50/50 dark:bg-green-950/30 text-neutral-800 dark:text-neutral-200 border border-green-200/80 dark:border-green-900/60 rounded-lg p-2.5 mb-2 font-medium border-l-2 border-l-green-500 break-words">
                                <span className="italic">"{quote}"</span>
                              </div>
                            )}

                            <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed mt-1 break-words">{bodyText}</p>
                          </div>
                        </div>

                        {replies.length > 0 && (
                          <div className="pl-4 md:pl-8 space-y-3 border-l-2 border-neutral-100 dark:border-neutral-800 ml-4">
                            {replies.map((reply) => {
                              const replyMeta = parseAnnotationMeta(reply.content);
                              const isReplyFlashed = flashedCommentId === reply.$id;
                              const replyLiked = currentUser && (reply.liked_by || []).includes(currentUser.$id);
                              const replyLikedByList: string[] = reply.liked_by || [];

                              return (
                                <div key={reply.$id} ref={(el) => { commentElementsRef.current[reply.$id] = el; }} className={`flex gap-3 items-start group/replycard p-3.5 rounded-xl border bg-neutral-50/60 dark:bg-neutral-900/60 transition-all duration-300 ${isReplyFlashed ? "border-blue-300 dark:border-blue-700 shadow-sm bg-blue-50/20 dark:bg-blue-950/20" : "border-neutral-200/60 dark:border-neutral-800"}`}>
                                  <HoverCard handle={reply.handle}>
                                    <div className="w-7 h-7 rounded-full bg-neutral-900 dark:bg-neutral-800 text-white text-[10px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden cursor-pointer">
                                      {reply.avatar_url ? <img src={reply.avatar_url} alt="" className="w-full h-full object-cover" /> : reply.handle?.charAt(0) || "?"}
                                    </div>
                                  </HoverCard>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                      <HoverCard handle={reply.handle}>
                                        <span className="text-xs font-bold text-neutral-900 dark:text-white cursor-pointer hover:underline truncate">{reply.name || `@${reply.handle}`}</span>
                                      </HoverCard>

                                      <div className="flex items-center gap-3 opacity-100 md:opacity-0 md:group-hover/replycard:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => handleLikeCommentToggle(reply)}
                                          className={`flex items-center gap-1 text-[11px] font-semibold transition ${
                                            replyLiked ? "text-[#0084FF]" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                                          }`}
                                        >
                                          <ThumbsUp className={`w-3.5 h-3.5 ${replyLiked ? "fill-[#0084FF]" : ""}`} />
                                          <span>{replyLikedByList.length > 0 ? replyLikedByList.length : "Like"}</span>
                                        </button>

                                        {currentUser?.$id === reply.user_id && (
                                          <button onClick={() => setItemToDelete({ type: "comment", id: reply.$id })} className="text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition" title="Delete reply">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed break-words">{replyMeta.bodyText}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {replyingToId === c.$id && (
                          <div className="pl-4 md:pl-8 ml-4 pt-1 animate-in fade-in duration-200">
                            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                                <CornerDownRight className="w-3 h-3 text-[#0084FF]" />
                                <span className="truncate">Replying to {c.name || `@${c.handle}`}</span>
                              </div>
                              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..." className="w-full p-2.5 min-h-[60px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-[#0084FF] resize-none placeholder:text-neutral-400 transition" />
                              <div className="flex items-center justify-end gap-2">
                                <button type="button" onClick={() => { setReplyingToId(null); setReplyText(""); }} className="px-2.5 py-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition">Cancel</button>
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

              <div className="flex gap-3 items-start py-4 bg-neutral-50/50 dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
                <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-neutral-800 text-white text-[11px] font-bold flex items-center justify-center uppercase shrink-0 overflow-hidden shadow-sm">
                  {currentUserProfile?.avatar_url ? <img src={currentUserProfile.avatar_url} alt="" className="w-full h-full object-cover" /> : currentUserProfile?.handle?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0 space-y-2.5">
                  {selectedTextQuote && (
                    <div className="flex items-center justify-between gap-4 bg-green-50/60 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 min-w-0">
                        <MessageSquare className="w-4 h-4 text-[#0084FF] shrink-0" />
                        <span className="italic truncate font-medium">Annotating selection: "{selectedTextQuote}"</span>
                      </div>
                      <button onClick={() => setSelectedTextQuote("")} className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <textarea ref={textareaRef} value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={currentUser ? "Write a public response or leave an annotated feedback note..." : "Log in to post annotations"} disabled={!currentUser} className="w-full p-3 min-h-[80px] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-[#0084FF] resize-none placeholder:text-neutral-400 transition disabled:opacity-50 shadow-2xs" />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {currentUser ? (
                      <button type="button" onClick={() => setIsPrivateNote(!isPrivateNote)} className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition ${isPrivateNote ? "bg-purple-50 dark:bg-purple-950/65 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-sm" : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}>
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
      </div>
    </main>
  );
}