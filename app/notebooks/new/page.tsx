"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createNotebook } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";

export default function NewNotebookPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) {
        router.push("/login");
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not logged in");

      const notebook = await createNotebook(user.$id, title, description, isPublic);
      router.push(`/notebooks/${notebook.$id}`);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) return <p className="p-8">Checking login...</p>;

  return (
    <main className="p-8 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">New Notebook</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border rounded p-2"
          required
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border rounded p-2"
          rows={3}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Make this notebook public
        </label>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white rounded p-2 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Notebook"}
        </button>
      </form>
    </main>
  );
}