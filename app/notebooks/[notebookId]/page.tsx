"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getNotebook, getChaptersForNotebook, createChapter } from "@/lib/appwrite";
import { getCurrentUser } from "@/lib/auth";
import { Book, Plus, MoreVertical, Edit2, MessageSquare, Clock, FileText, Globe } from "lucide-react";

export default function NotebookPage() {
  const { notebookId } = useParams<{ notebookId: string }>();
  const router = useRouter();
  
  const [notebook, setNotebook] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  // Viewing state: if 'root', we are reading the notebook's main description/introduction
  const [viewMode, setViewMode] = useState<"root" | "chapter">("root");
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const nb = await getNotebook(notebookId);
      const ch = await getChaptersForNotebook(notebookId);
      setNotebook(nb);
      setChapters(ch);
      
      // Default to showing the main notebook overview first
      setViewMode("root");

      const user = await getCurrentUser();
      setIsOwner(!!user && user.$id === nb.owner_id);
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

  if (loading) return <div className="p-8 text-xs font-medium text-neutral-400 animate-pulse">Loading workspace index...</div>;
  if (!notebook) return <div className="p-8 text-sm text-neutral-500">Notebook repository not found.</div>;

  return (
    <main className="w-full min-h-[calc(100vh-56px)] h-[calc(100vh-56px)] bg-white text-neutral-900 select-none overflow-hidden flex">
      
      {/* LEFT COLUMN PANEL: Index & Notebook Metadata — Independently Scrollable */}
      <div className="w-80 border-r border-neutral-200 flex flex-col h-full bg-neutral-50/50 shrink-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {/* Main Chapter Metadata - Clickable view-trigger setup */}
        <div 
          onClick={() => setViewMode("root")}
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

          {/* Snapshot acting as a clean subheading */}
          <p className="text-xs text-neutral-500 font-normal italic mt-1.5 leading-relaxed line-clamp-3">
            {notebook.snapshot || notebook.description || "Click to read the primary synopsis or introduction text of this repository."}
          </p>
          
          <div className="mt-4" />

          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Avoid triggering view change on click
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

        {/* Subchapters List Wrapper Segment */}
        <div className="p-4 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2 pl-1">
            Chapters Index
          </span>
          
          <nav className="space-y-0.5">
            {chapters.map((ch) => {
              const isActive = viewMode === "chapter" && selectedChapter?.$id === ch.$id;
              return (
                <div
                  key={ch.$id}
                  className="w-full relative group/item"
                >
                  <button
                    onClick={() => {
                      setSelectedChapter(ch);
                      setViewMode("chapter");
                    }}
                    className={`w-full text-left pl-3 pr-10 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                      isActive
                        ? "bg-white text-neutral-900 border border-neutral-200 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/70"
                    }`}
                  >
                    <FileText className={`w-3.5 h-3.5 ${isActive ? "text-neutral-900" : "text-neutral-400"}`} />
                    <span className="truncate flex-1">{ch.title || "Untitled chapter"}</span>
                  </button>

                  {/* Inline Edit Button: Visible ONLY on item hover and ONLY if current user is owner */}
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

      {/* RIGHT COLUMN PANEL: Content Display & Footer Comments — Independently Scrollable */}
      <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {/* VIEW ONE: Main Notebook Cover View */}
        {viewMode === "root" && (
          <div className="max-w-2xl w-full mx-auto px-6 md:px-12 py-10 flex flex-col min-h-full">
            <div className="flex justify-between items-start gap-6 border-b border-neutral-100 pb-4 mb-6 relative">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 leading-tight">
                  {notebook.title}
                </h2>
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

        {/* VIEW TWO: Active Selected Chapter View */}
        {viewMode === "chapter" && selectedChapter && (
          <div className="max-w-2xl w-full mx-auto px-6 md:px-12 py-10 flex flex-col min-h-full">
            
            {/* Chapter header wrapper */}
            <div className="flex justify-between items-start gap-6 border-b border-neutral-100 pb-4 mb-6 relative">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 leading-tight">
                  {selectedChapter.title || "Untitled chapter"}
                </h2>
                <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {selectedChapter.$createdAt 
                      ? new Date(selectedChapter.$createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) 
                      : "Draft stage"}
                  </span>
                </div>
              </div>

              {/* Three Dots Configuration Interactive Layer */}
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

            {/* Chapter Body Markdown Text Frame Area */}
            <div className="flex-1 text-sm text-neutral-800 leading-relaxed font-normal whitespace-pre-wrap break-words">
              {selectedChapter.content || (
                <p className="italic text-neutral-400">This chapter contains no written content text yet.</p>
              )}
            </div>

            {/* SEGREGATED FOOTER: Comments section anchored beneath the reading window */}
            <div className="mt-16 pt-8 border-t border-neutral-200 bg-white">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-neutral-900" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Discussion Feed
                </h3>
                <span className="text-[10px] bg-neutral-100 text-neutral-600 font-bold px-1.5 py-0.5 rounded-full">
                  0
                </span>
              </div>

              {/* Comment Input Box */}
              <div className="flex gap-3 items-start mb-6">
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center uppercase shrink-0">
                  U
                </div>
                <div className="flex-1 space-y-2">
                  <textarea 
                    placeholder="Write a response or feedback snippet..." 
                    className="w-full p-2.5 min-h-[72px] rounded-lg border border-neutral-200 text-xs focus:outline-none focus:border-neutral-400 resize-none placeholder:text-neutral-400 transition"
                  />
                  <div className="flex justify-end">
                    <button className="h-7 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium shadow-sm transition">
                      Respond
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-center py-6 border border-dashed border-neutral-100 rounded-xl bg-neutral-50/40">
                <p className="text-xs text-neutral-400 italic">No responses written for this section yet.</p>
              </div>
            </div>

          </div>
        )}

      </div>

    </main>
  );
}