"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getNotebook, getChaptersForNotebook, createChapter } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";

export default function NotebookPage() {
  const { notebookId } = useParams<{ notebookId: string }>();
  const router = useRouter();
  const [notebook, setNotebook] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      const nb = await getNotebook(notebookId);
      const ch = await getChaptersForNotebook(notebookId);
      setNotebook(nb);
      setChapters(ch);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [notebookId]);

  const handleNewChapter = async () => {
    setCreating(true);
    try {
      const nextOrder = chapters.length;
      const chapter = await createChapter(notebookId, "Untitled chapter", "", nextOrder);
      router.push(`/notebooks/${notebookId}/chapters/${chapter.$id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <p className="p-8">Loading...</p>;
  if (!notebook) return <p className="p-8">Notebook not found.</p>;

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">{notebook.title}</h1>
      {notebook.description && <p className="text-gray-600 mt-2">{notebook.description}</p>}

      <div className="mt-6">
        <button
          onClick={handleNewChapter}
          disabled={creating}
          className="bg-black text-white rounded p-2 px-4 disabled:opacity-50"
        >
          {creating ? "Creating..." : "+ New Chapter"}
        </button>
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {chapters.map((ch) => (
         <li key={ch.$id}>
            
             <a href={`/notebooks/${notebookId}/chapters/${ch.$id}`}
              className="underline"
            >
              {ch.title}
            </a>
          </li>
        ))}
        {chapters.length === 0 && (
          <p className="text-sm text-gray-400">No chapters yet.</p>
        )}
      </ul>
    </main>
  );
}