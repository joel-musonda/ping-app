"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";
import Editor from "@/components/Editor";
import { Heart, Trash2 } from "lucide-react";

export default function ChapterEditorPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [initialContent, setInitialContent] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [likeId, setLikeId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [currentUserHandle, setCurrentUserHandle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getChapter(chapterId)
      .then(async (chapter) => {
        if (cancelled) return;
        setTitle(chapter.title);
        setInitialContent(chapter.content_json || undefined);

        try {
          const notebook = await getNotebook(chapter.notebook_id);
          const user = await getCurrentUser();
          if (cancelled) return;

          setCurrentUser(user);
          setIsOwner(!!user && user.$id === notebook.owner_id);

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
        } catch {
          setIsOwner(false);
        }

        if (!cancelled) setStatus("");
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setStatus("Failed to load chapter");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const saveContent = async (json: object) => {
    try {
      await updateChapter(chapterId, { content_json: JSON.stringify(json) });
      setStatus("Saved ✅");
    } catch (err) {
      console.error(err);
      setStatus("Failed ❌");
    }
  };

  const handleEditorChange = (json: object) => {
    if (!isOwner) return;
    setStatus("Typing...");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => saveContent(json), 1000);
  };

  const handleTitleBlur = async () => {
    if (!isOwner) return;
    try {
      await updateChapter(chapterId, { title });
      setStatus("Saved ✅");
    } catch (err) {
      console.error(err);
      setStatus("Failed to save title");
    }
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
        const newLike = await likeChapter(currentUser.$id, chapterId);
        setLikeId(newLike.$id);
        setLikeCount((c) => c + 1);
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
        chapterId,
        currentUser.$id,
        currentUserHandle || "anonymous",
        newComment.trim()
      );
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
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

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <main className="p-8 max-w-2xl mx-auto">
      {!isOwner && (
        <p className="text-sm text-amber-500 mb-4">
          You&apos;re viewing this in read-only mode.
        </p>
      )}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        readOnly={!isOwner}
        className="text-2xl font-bold w-full border-b pb-2 mb-4 bg-transparent outline-none disabled:opacity-70"
      />
      <Editor content={initialContent} onChange={handleEditorChange} editable={isOwner} />
      {isOwner && <p className="text-sm text-gray-400 mt-2">{status}</p>}

      <div className="mt-6 flex items-center gap-2 border-t pt-4">
        <button
          onClick={handleLikeToggle}
          disabled={likeLoading}
          className={`flex items-center gap-1.5 text-sm rounded-full px-3 py-1.5 border transition-colors ${
            likeId
              ? "bg-red-50 border-red-200 text-red-600"
              : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
          }`}
        >
          <Heart className={`w-4 h-4 ${likeId ? "fill-red-500 text-red-500" : ""}`} />
          <span>{likeCount}</span>
        </button>
      </div>

      <div className="mt-8 border-t pt-6">
        <h2 className="text-sm font-bold text-gray-700 mb-3">
          Comments ({comments.length})
        </h2>

        <div className="flex flex-col gap-2 mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={currentUser ? "Add a comment..." : "Log in to comment"}
            disabled={!currentUser}
            className="border rounded p-2 text-sm resize-none disabled:opacity-50"
            rows={2}
          />
          <button
            onClick={handlePostComment}
            disabled={postingComment || !newComment.trim()}
            className="self-end bg-black text-white text-sm rounded px-3 py-1.5 disabled:opacity-50"
          >
            {postingComment ? "Posting..." : "Post"}
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {comments.length === 0 && (
            <p className="text-sm text-gray-400">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.$id} className="flex justify-between items-start gap-2 text-sm">
              <div>
                <span className="font-semibold">@{c.handle}</span>
                <p className="text-gray-700 mt-0.5">{c.content}</p>
              </div>
              {currentUser?.$id === c.user_id && (
                <button
                  onClick={() => handleDeleteComment(c.$id)}
                  className="text-gray-400 hover:text-red-500 shrink-0"
                  title="Delete comment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}