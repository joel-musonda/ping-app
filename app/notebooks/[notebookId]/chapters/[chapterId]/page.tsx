"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { getChapter, updateChapter, getNotebook } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";
import Editor from "@/components/Editor";

export default function ChapterEditorPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const [title, setTitle] = useState("");
  const [initialContent, setInitialContent] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getChapter(chapterId)
      .then(async (chapter) => {
        setTitle(chapter.title);
        setInitialContent(chapter.content_json || undefined);

        try {
          const notebook = await getNotebook(chapter.notebook_id);
          const user = await getCurrentUser();
          setIsOwner(!!user && user.$id === notebook.owner_id);
        } catch {
          setIsOwner(false);
        }

        setStatus("");
      })
      .catch((err) => {
        console.error(err);
        setStatus("Failed to load chapter");
      })
      .finally(() => setLoading(false));
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
    </main>
  );
}