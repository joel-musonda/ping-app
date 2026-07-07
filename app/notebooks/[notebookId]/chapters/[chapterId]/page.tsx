"use client";

import { useEffect, useState, useRef, ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import {
  getChapter,
  updateChapter,
  getNotebook,
  checkIsLiked,
  getLikeCount,
  likeChapter,
  unlikeChapter,
  createComment,
  getCommentsForChapter,
  deleteComment,
  getPingByUserId,
  uploadNotebookCoverImage,
  getNotebookCoverImageUrl
} from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading2, List, ImageIcon, ArrowLeft, Check, CloudLightning, 
  Bookmark, MessageSquare, Trash2, Heart 
} from "lucide-react";

export default function ChapterWorkspacePage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reader Telemetry State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [likeId, setLikeId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [currentUserHandle, setCurrentUserHandle] = useState<string | null>(null);

  // Initialize Tiptap core editor matching your notebook environment layout exactly
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      ImageExtension.configure({
        HTMLAttributes: {
          class: "rounded-xl border max-h-[400px] w-auto mx-auto my-4 object-cover shadow-sm",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    editorProps: {
      attributes: {
        class: "prose focus:outline-none min-h-[450px] max-w-none text-neutral-800",
      },
    },
    onUpdate: ({ editor }) => {
      if (!isOwner) return;
      setStatus("Saving...");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        saveContent(editor.getJSON());
      }, 1200);
    },
  });

  useEffect(() => {
    let cancelled = false;

    getChapter(chapterId)
      .then(async (chapter) => {
        if (cancelled) return;
        setTitle(chapter.title);
        setNotebookId(chapter.notebook_id);

        // Load initial content array securely into the Tiptap context editor shell
        if (editor && chapter.content_json) {
          try {
            editor.commands.setContent(JSON.parse(chapter.content_json));
          } catch (e) {
            editor.commands.setContent(chapter.content_json);
          }
        }

        try {
          const notebook = await getNotebook(chapter.notebook_id);
          const user = await getCurrentUser();
          if (cancelled) return;

          setCurrentUser(user);
          const absoluteOwner = !!user && user.$id === notebook.owner_id;
          setIsOwner(absoluteOwner);

          // Configure operational modes context state rules
          if (absoluteOwner) {
            editor?.setEditable(true);
            setLoading(false);
            return;
          }

          // Reader View fallback logic remains intact if visited externally
          editor?.setEditable(false);
          const [count, likedId, chapterComments] = await Promise.all([
            getLikeCount(chapterId),
            user ? checkIsLiked(user.$id, chapterId) : Promise.resolve(null),
            getCommentsForChapter(chapterId),
          ]);
          
          if (cancelled) return;
          setLikeCount(count);
          setLikeId(likedId);
          setComments(chapterComments);

          if (user) {
            const viewerPing = await getPingByUserId(user.$id);
            if (!cancelled) setCurrentUserHandle(viewerPing?.handle ?? null);
          }
        } catch (err) {
          console.error("Workspace initialization block anomaly:", err);
          setIsOwner(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setStatus("Failed to load chapter context");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chapterId, editor]);

  const saveContent = async (json: object) => {
    try {
      await updateChapter(chapterId, { content_json: JSON.stringify(json) });
      setStatus("Saved");
    } catch (err) {
      console.error(err);
      setStatus("Failed");
    }
  };

  const handleTitleBlur = async () => {
    if (!isOwner) return;
    try {
      setStatus("Saving...");
      await updateChapter(chapterId, { title: title.trim() });
      setStatus("Saved");
    } catch (err) {
      console.error(err);
      setStatus("Failed");
    }
  };

  // Image insertion pipeline utilizing the precise Appwrite configuration logic from page.tsx
  const addLocalImageViaUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    setStatus("Uploading image...");
    try {
      const fileId = await uploadNotebookCoverImage(file);
      const publicUrl = getNotebookCoverImageUrl(fileId);
      
      editor.chain().focus().setImage({ src: publicUrl }).run();
      e.target.value = ''; 
      setStatus("Saved");
    } catch (err) {
      console.error("Image insertion failure:", err);
      setStatus("Failed");
    }
  };

  const handlePublishAndReturn = async () => {
    setStatus("Finalizing sync...");
    try {
      // Direct snapshot check to commit title string modifications prior to layout teardown
      await updateChapter(chapterId, { 
        title: title.trim() || "Untitled Chapter",
        content_json: JSON.stringify(editor?.getJSON() ?? {})
      });
      
      // Smooth programmatic return route back to notebook preview canvas
      if (notebookId) {
        window.location.href = `/notebooks/${notebookId}`;
      } else {
        router.back();
      }
    } catch (err) {
      console.error("Finalization sync failed:", err);
      alert("Could not update chapter contents securely. Please try again.");
    }
  };

  // Standard interactive event hooks for public feed streams
  const handleLikeToggle = async () => {
    if (!currentUser) return router.push("/login");
    setLikeLoading(true);
    try {
      if (likeId) {
        await unlikeChapter(likeId);
        setLikeId(null);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        const newLike = await likeChapter(currentUser.$id, chapterId);
        setLikeId(newLike.$id);
        setLikeCount((c) => c + 1);
      }
    } catch (err) { console.error(err); }
    finally { setLikeLoading(false); }
  };

  const handlePostComment = async () => {
    if (!currentUser) return router.push("/login");
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const comment = await createComment(chapterId, currentUser.$id, currentUserHandle || "anonymous", newComment.trim());
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
    } catch (err) { console.error(err); }
    finally { setPostingComment(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.$id !== commentId));
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-xs text-neutral-400 font-medium tracking-wide bg-neutral-50/40">
        Loading canvas viewport...
      </div>
    );
  }

  // --- RENDER BLOCK A: AUTHOR WORKSPACE MODE (NO REACTION TRAILING NODES) ---
  if (isOwner) {
    return (
      <main className="min-h-[calc(100vh-56px)] bg-neutral-50/40 pb-20">
        <input 
          type="file" 
          accept="image/*" 
          id="tiptap-chapter-image-upload" 
          className="hidden" 
          onChange={addLocalImageViaUpload} 
        />

        {/* STICKY WORKSPACE CONTROLS HEADER */}
        <div className="sticky top-0 z-30 bg-white border-b border-neutral-200 px-4 py-3 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            
            <button 
              onClick={() => router.back()}
              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 transition"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Micro Layout Typography Action Hub */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
              <button onClick={() => editor?.chain().focus().toggleBold().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition"><Bold className="w-4 h-4" /></button>
              <button onClick={() => editor?.chain().focus().toggleItalic().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition"><Italic className="w-4 h-4" /></button>
              <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition"><UnderlineIcon className="w-4 h-4" /></button>
              <button onClick={() => editor?.chain().focus().toggleStrike().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition"><Strikethrough className="w-4 h-4" /></button>
              <div className="w-px h-4 bg-neutral-200 mx-1" />
              <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition"><Heading2 className="w-4 h-4" /></button>
              <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition"><List className="w-4 h-4" /></button>
              <div className="w-px h-4 bg-neutral-200 mx-1" />
              <label htmlFor="tiptap-chapter-image-upload" className="p-1.5 rounded-md text-neutral-600 hover:bg-white cursor-pointer transition"><ImageIcon className="w-4 h-4" /></label>
            </div>

            {/* Cloud Sync Signal Tracker & Finalization Engine */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
                {status === "Saved" ? (
                  <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <Check className="w-3 h-3" /> Sync Completed
                  </span>
                ) : status === "Saving..." || status === "Uploading image..." ? (
                  <span className="flex items-center gap-1 text-amber-500 animate-pulse">
                    <CloudLightning className="w-3 h-3" /> Syncing payload...
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-neutral-400"><Bookmark className="w-3 h-3" /> Changes Staged</span>
                )}
              </div>

              <button 
                onClick={handlePublishAndReturn}
                className="h-8 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-semibold shadow-sm transition"
              >
                Publish Chapter
              </button>
            </div>

          </div>
        </div>

        {/* WORKSPACE AREA */}
        <div className="max-w-2xl mx-auto px-6 mt-10">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Chapter Title"
            className="w-full bg-transparent text-3xl font-black placeholder:text-neutral-200 border-none focus:outline-none focus:ring-0 mb-6 text-neutral-900 tracking-tight"
          />
          <div className="bg-white border border-neutral-200 shadow-sm rounded-xl p-6 sm:p-8 min-h-[450px]">
            <EditorContent editor={editor} />
          </div>
        </div>
      </main>
    );
  }

  // --- RENDER BLOCK B: PUBLIC READ FORMAT CANVAS (SHOWS ENGAGEMENT FEEDS) ---
  return (
    <main className="py-6 max-w-2xl mx-auto px-4 space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg text-xs font-semibold">
          <span>You are viewing this chapter in read-only library format.</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-neutral-900 border-b pb-2">
          {title || "Untitled Document"}
        </h1>
      </div>

      <div className="prose max-w-none min-h-[200px] text-neutral-800 leading-relaxed">
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center gap-2 border-t border-neutral-100 pt-5">
        <button
          onClick={handleLikeToggle}
          disabled={likeLoading}
          className={`flex items-center gap-1.5 text-xs font-bold rounded-full px-4 py-2 border transition ${
            likeId ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm" : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${likeId ? "fill-rose-500 text-rose-500" : ""}`} />
          <span>{likeCount} likes</span>
        </button>
      </div>

      <div className="border-t border-neutral-100 pt-6 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Responses ({comments.length})</span>
        </h3>

        <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/60 space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={currentUser ? "Write a response or feedback snippet..." : "Sign in to add your voice..."}
            disabled={!currentUser}
            className="w-full border-none bg-transparent text-xs text-neutral-800 placeholder:text-neutral-400 focus:ring-0 p-1 resize-none"
            rows={3}
          />
          <div className="flex justify-end pt-1">
            <button
              onClick={handlePostComment}
              disabled={postingComment || !newComment.trim()}
              className="bg-neutral-900 text-white text-xs font-semibold rounded-md px-4 py-1.5 hover:bg-neutral-800 shadow-sm transition disabled:opacity-40"
            >
              {postingComment ? "Submitting..." : "Respond"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-4 border border-dashed rounded-xl border-neutral-100">No responses written for this section yet.</p>
          ) : (
            comments.map((c) => (
              <div key={c.$id} className="flex justify-between items-start gap-4 text-xs p-3.5 border border-neutral-100 rounded-xl bg-white shadow-sm">
                <div className="space-y-1">
                  <span className="font-bold text-neutral-900">@{c.handle}</span>
                  <p className="text-neutral-600 leading-relaxed">{c.content}</p>
                </div>
                {currentUser?.$id === c.user_id && (
                  <button onClick={() => handleDeleteComment(c.$id)} className="text-neutral-300 hover:text-rose-600 transition p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}