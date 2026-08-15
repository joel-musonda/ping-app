"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { 
  BookOpen, Plus, FileText, Globe, Share2, Edit2, Trash2, 
  CheckCircle2, Clock, ArrowUpRight, Lock, Sparkles 
} from "lucide-react";
import { databases, DATABASE_ID, NOTEBOOKS_COLLECTION_ID } from "@/lib/appwrite";
import { Query } from "appwrite";

interface Notebook {
  $id: string;
  title: string;
  description?: string;
  snapshot?: string;
  preview_image_url?: string;
  is_public: boolean;
  is_draft?: boolean;
  owner_id: string;
  updatedAt?: string;
  isLocalDraft?: boolean;
}

export default function MyNotebooksPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"drafts" | "published" | "reshared">("drafts");
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };


       // Dynamic Page Title Effect
       useEffect(() => {
         document.title = "My Notebooks | Ping";
       }, []);


  useEffect(() => {
    async function loadUserAndNotebooks() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/signup");
          return;
        }
        setCurrentUser(user);

        // 1. Fetch user notebooks from Appwrite database
        const response = await databases.listDocuments(
          DATABASE_ID,
          NOTEBOOKS_COLLECTION_ID,
          [Query.equal("owner_id", user.$id)]
        );

        let fetchedNotebooks: Notebook[] = response.documents.map((doc: any) => ({
          $id: doc.$id,
          title: doc.title,
          description: doc.description,
          snapshot: doc.snapshot,
          preview_image_url: doc.preview_image_url || doc.cover_image_url,
          is_public: doc.is_public ?? true,
          is_draft: doc.is_draft ?? false,
          owner_id: doc.owner_id,
          updatedAt: doc.$updatedAt,
        }));

        // 2. Check for an active localStorage draft from the writing space
        const savedDraft = localStorage.getItem("notebook_local_draft");
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            if (parsed.title || parsed.content) {
              const localDraftNotebook: Notebook = {
                $id: "local-unsaved-draft",
                title: parsed.title || "Untitled Local Draft",
                snapshot: parsed.snapshot || "Unsaved draft stored locally in your browser.",
                is_public: parsed.isPublic ?? false,
                is_draft: true,
                owner_id: user.$id,
                updatedAt: parsed.updatedAt || new Date().toISOString(),
                isLocalDraft: true,
              };
              // Prepend local draft to the list
              fetchedNotebooks = [localDraftNotebook, ...fetchedNotebooks];
            }
          } catch (e) {
            console.error("Failed to parse local draft:", e);
          }
        }

        setNotebooks(fetchedNotebooks);
      } catch (err) {
        console.error("Failed to load notebooks:", err);
        showToast("Failed to load notebooks from database.");
      } finally {
        setLoading(false);
      }
    }

    loadUserAndNotebooks();
  }, [router]);

  const handleDeleteNotebook = async (notebookId: string, isLocal: boolean = false, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this notebook?")) return;
    
    try {
      if (isLocal) {
        localStorage.removeItem("notebook_local_draft");
        setNotebooks((prev) => prev.filter((nb) => nb.$id !== notebookId));
        showToast("Local draft deleted successfully");
        return;
      }

      await databases.deleteDocument(
        DATABASE_ID,
        NOTEBOOKS_COLLECTION_ID,
        notebookId
      );

      setNotebooks((prev) => prev.filter((nb) => nb.$id !== notebookId));
      showToast("Notebook deleted successfully");
    } catch (err) {
      console.error(err);
      alert("Could not delete notebook.");
    }
  };

  const handleTogglePublish = async (notebook: Notebook, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notebook.isLocalDraft) {
      router.push("/notebooks/new");
      return;
    }

    try {
      const updatedDraftStatus = !notebook.is_draft;
      const updatedPublicStatus = !updatedDraftStatus;

      await databases.updateDocument(
        DATABASE_ID,
        NOTEBOOKS_COLLECTION_ID,
        notebook.$id,
        {
          is_draft: updatedDraftStatus,
          is_public: updatedPublicStatus,
        }
      );

      setNotebooks((prev) =>
        prev.map((nb) =>
          nb.$id === notebook.$id 
            ? { ...nb, is_draft: updatedDraftStatus, is_public: updatedPublicStatus } 
            : nb
        )
      );
      showToast(updatedDraftStatus ? "Moved notebook to drafts" : "Notebook published successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update publication status.");
    }
  };

  const filteredNotebooks = notebooks.filter((nb) => {
    if (activeTab === "drafts") return nb.is_draft;
    if (activeTab === "published") return !nb.is_draft;
    if (activeTab === "reshared") return false; // Reshared tab placeholder
    return true;
  });

  if (loading) {
    return (
      <main className="w-full min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors">
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 md:px-12 pt-8 sm:pt-12 pb-24 flex flex-col flex-1 animate-pulse">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="space-y-2">
              <div className="h-7 w-44 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
              <div className="h-3 w-64 bg-neutral-100 dark:bg-neutral-900 rounded-md" />
            </div>
            <div className="h-9 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          </div>

          {/* Tabs Skeleton */}
          <div className="h-11 w-full sm:w-72 bg-neutral-100 dark:bg-neutral-900 rounded-full mb-8" />

          {/* Cards Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-2xl border border-neutral-200/85 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-2xs">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
                    <div className="h-3 w-24 bg-neutral-100 dark:bg-neutral-800/60 rounded-md" />
                  </div>
                  <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
                  <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800/60 rounded-md" />
                  <div className="h-3 w-2/3 bg-neutral-100 dark:bg-neutral-800/60 rounded-md" />
                </div>
                <div className="flex items-center gap-2 self-end sm:self-start">
                  <div className="h-9 w-9 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
                  <div className="h-9 w-9 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
                  <div className="h-9 w-9 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-950 dark:bg-neutral-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200 border border-neutral-800">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 md:px-12 pt-8 sm:pt-12 pb-24 flex flex-col flex-1">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">My Notebooks</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Manage your active drafts, published publications, and shared repositories.</p>
          </div>
          <button
            onClick={() => router.push("/notebooks/new")}
            style={{ backgroundColor: "#0084FF" }}
            className="h-9 px-4 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition hover:opacity-90 w-full sm:w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Create Notebook</span>
          </button>
        </div>

        {/* Pill Tabs Navigation */}
        <div className="bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded-full inline-flex w-full sm:w-fit mb-8 gap-1 border border-neutral-200/60 dark:border-neutral-800 shadow-2xs overflow-x-auto">
          <button
            onClick={() => setActiveTab("drafts")}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === "drafts"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Drafts</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "drafts" ? "bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white" : "bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"}`}>
              {notebooks.filter((n) => n.is_draft).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("published")}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === "published"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Published</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "published" ? "bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white" : "bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"}`}>
              {notebooks.filter((n) => !n.is_draft).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("reshared")}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === "reshared"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Reshared</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "reshared" ? "bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white" : "bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"}`}>
              0
            </span>
          </button>
        </div>

        {/* Notebook Cards List */}
        {filteredNotebooks.length === 0 ? (
          <div className="border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 bg-neutral-50/50 dark:bg-neutral-900/30 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto text-neutral-400 dark:text-neutral-500 shadow-xs">
              {activeTab === "drafts" ? <Clock className="w-5 h-5" /> : activeTab === "published" ? <Globe className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white capitalize">No {activeTab} found</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                {activeTab === "drafts" 
                  ? "You don't have any notebook drafts saved right now. Start writing a new notebook to keep it private as a draft."
                  : activeTab === "published"
                  ? "You haven't published any notebooks yet. Publish your drafts to share them with the world."
                  : "Notebooks reshared with you will appear here once the feature becomes available."}
              </p>
            </div>
            {activeTab === "drafts" && (
              <button
                onClick={() => router.push("/notebooks/new")}
                style={{ backgroundColor: "#0084FF" }}
                className="px-4 py-2 text-white rounded-xl text-xs font-semibold shadow-sm transition hover:opacity-90 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Draft</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredNotebooks.map((notebook) => (
              <div
                key={notebook.$id}
                onClick={() => router.push(notebook.isLocalDraft ? "/notebooks/new" : `/notebooks/${notebook.$id}`)}
                className="group p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50/40 dark:hover:bg-neutral-800/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-2xs"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 ${notebook.is_draft ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50" : "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200/60 dark:border-green-800/50"}`}>
                      {notebook.is_draft ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                      <span>{notebook.is_draft ? "Draft" : "Published"}</span>
                    </span>
                    {notebook.isLocalDraft && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Unsaved Local Draft</span>
                      </span>
                    )}
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">• Updated recently</span>
                  </div>

                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-neutral-950 dark:group-hover:text-neutral-200 transition truncate">
                    {notebook.title}
                  </h2>

                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal line-clamp-2 leading-relaxed">
                    {notebook.description || notebook.snapshot || "No description provided."}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-start shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800 w-full sm:w-auto justify-end">
                  <button
                    onClick={(e) => handleTogglePublish(notebook, e)}
                    className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition shadow-2xs"
                    title={notebook.isLocalDraft ? "Resume Writing" : notebook.is_draft ? "Publish Notebook" : "Move to Drafts"}
                  >
                    {notebook.isLocalDraft ? <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : notebook.is_draft ? <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" /> : <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(notebook.isLocalDraft ? "/notebooks/new" : `/notebooks/${notebook.$id}`);
                    }}
                    className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition shadow-2xs"
                    title="Edit Notebook"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleDeleteNotebook(notebook.$id, notebook.isLocalDraft, e)}
                    className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/50 transition shadow-2xs"
                    title="Delete Notebook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}