"use client";

import { useState, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading2, List, ImageIcon, Upload, FileText, Globe, X, Camera, Trash2, Users,
  Link as LinkIcon, Quote, Code
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  uploadNotebookCoverImage, getNotebookCoverImageUrl, createNotebook, createChapter,
  getPingByUserId, searchPingsByHandle, inviteCollaborator,
} from "@/lib/appwrite";

export default function CreateNotebookPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [snapshot, setSnapshot] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Collaborator invite state
  const [collabQuery, setCollabQuery] = useState("");
  const [collabResults, setCollabResults] = useState<any[]>([]);
  const [collabSearching, setCollabSearching] = useState(false);
  const [selectedCollaborators, setSelectedCollaborators] = useState<any[]>([]);
  const collabTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      Placeholder.configure({
        placeholder: "Your thouhts come here...",
        emptyEditorClass: "is-editor-empty",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
        },
      }),
      ImageExtension.configure({
        HTMLAttributes: {
          class: "rounded-xl border max-h-[300px] sm:max-h-[400px] w-auto mx-auto my-4 object-cover shadow-sm",
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose focus:outline-none min-h-[300px] sm:min-h-[400px] max-w-none text-neutral-800 " +
          "[&_.is-editor-empty:first-child::before]:text-neutral-400/70 " +
          "[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] " +
          "[&_.is-editor-empty:first-child::before]:float-left " +
          "[&_.is-editor-empty:first-child::before]:pointer-events-none " +
          "[&_.is-editor-empty:first-child::before]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] " +
          "[&_.is-editor-empty:first-child::before]:font-medium",
      },
    },
  });

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addLocalImageViaUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    try {
      const fileId = await uploadNotebookCoverImage(file);
      const publicUrl = getNotebookCoverImageUrl(fileId);
      editor.chain().focus().setImage({ src: publicUrl }).run();
      e.target.value = "";
    } catch (err) {
      console.error("Image insertion failure:", err);
    }
  };

  const handleCoverImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fileId = await uploadNotebookCoverImage(file);
      const publicUrl = getNotebookCoverImageUrl(fileId);
      if (!publicUrl) throw new Error("getNotebookCoverImageUrl returned an empty string.");
      setCoverImageUrl(publicUrl);
    } catch (err: any) {
      console.error("CRITICAL UPLOAD PIPELINE FAILURE:", err);
      alert(`Upload Failed: ${err?.message || err}`);
    }
  };

  const handleCollabSearchChange = (value: string) => {
    setCollabQuery(value);
    if (collabTimeoutRef.current) clearTimeout(collabTimeoutRef.current);

    if (value.trim().length === 0) {
      setCollabResults([]);
      return;
    }

    collabTimeoutRef.current = setTimeout(async () => {
      setCollabSearching(true);
      try {
        const results = await searchPingsByHandle(value.trim());
        setCollabResults(results);
      } catch (err) {
        console.error("Collaborator search failed:", err);
        setCollabResults([]);
      } finally {
        setCollabSearching(false);
      }
    }, 400);
  };

  const handleAddCollaborator = (ping: any) => {
    if (selectedCollaborators.some((c) => c.$id === ping.$id)) return;
    setSelectedCollaborators((prev) => [...prev, ping]);
    setCollabQuery("");
    setCollabResults([]);
  };

  const handleRemoveCollaborator = (pingId: string) => {
    setSelectedCollaborators((prev) => prev.filter((c) => c.$id !== pingId));
  };

  const executePublishPipeline = async () => {
    if (!title.trim()) return alert("Please Go back and specify a notebook title first.");
    if (!snapshot.trim()) return alert("A snapshot description summary is required.");
    if (!coverImageUrl) return alert("Please select a cover thumbnail image before publishing.");

    setPublishing(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("User session not found. Please log in again.");

      const notebook = await createNotebook(
        user.$id,
        title.trim(),
        "",
        isPublic,
        snapshot.trim(),
        coverImageUrl.trim()
      );

      const contentJson = editor?.getJSON() ?? {};
      await createChapter(
        notebook.$id,
        user.$id,
        isPublic,
        title.trim(),
        JSON.stringify(contentJson),
        0
      );

      if (selectedCollaborators.length > 0) {
        try {
          const ownerProfile = await getPingByUserId(user.$id);
          for (const c of selectedCollaborators) {
            await inviteCollaborator(
              notebook.$id,
              title.trim(),
              user.$id,
              ownerProfile?.name || "",
              ownerProfile?.handle || "anonymous",
              c.user_id
            );
          }
        } catch (err: any) {
          console.error("Failed to send one or more collaboration invites:", err);
          alert(`STOP! Invite failed with message:\n\n${err?.message || err}`);
        }
      }

      setIsPublishModalOpen(false);
      window.location.href = `/notebooks/${notebook.$id}`;
    } catch (err: any) {
      console.error("CRITICAL BACKEND WRITE ERROR:", err);
      alert(`Appwrite Error: ${err?.message || err}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-56px)] bg-neutral-50/40 pb-16 sm:pb-20">

      <input type="file" accept="image/*" id="tiptap-image-upload" className="hidden" onChange={addLocalImageViaUpload} />
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleCoverImageUpload} />

      {/* Sticky Mobile-Responsive Top Formatting Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-200 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">

          {/* Horizontally Scrollable Formatting Controls on Mobile */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg overflow-x-auto no-scrollbar scrollbar-none max-w-full shrink-0">
            <button onClick={() => editor?.chain().focus().toggleBold().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition shrink-0" title="Bold"><Bold className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().toggleItalic().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition shrink-0" title="Italic"><Italic className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition shrink-0" title="Underline"><UnderlineIcon className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().toggleStrike().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition shrink-0" title="Strikethrough"><Strikethrough className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-neutral-200 mx-0.5 shrink-0" />
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition shrink-0" title="Heading"><Heading2 className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition shrink-0" title="Bullet List"><List className="w-4 h-4" /></button>
            <button onClick={setLink} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition shrink-0" title="Add Link"><LinkIcon className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().toggleBlockquote().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition shrink-0" title="Quote"><Quote className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().toggleCode().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600 transition shrink-0" title="Code"><Code className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-neutral-200 mx-0.5 shrink-0" />
            <label htmlFor="tiptap-image-upload" className="p-1.5 rounded-md text-neutral-600 hover:bg-white cursor-pointer transition shrink-0" title="Upload Image"><ImageIcon className="w-4 h-4" /></label>
          </div>

          {/* Action Row: Toggle Switch & Publish Button */}
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-neutral-100 sm:border-none">
            {/* Public/Private Toggle Switch */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isPublic ? "bg-blue-600" : "bg-neutral-300"
                }`}
                role="switch"
                aria-checked={isPublic}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isPublic ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-xs font-semibold text-neutral-700">
                {isPublic ? "Public" : "Private"}
              </span>
            </div>

            {/* Styled Publish Button */}
            <button
              onClick={() => setIsPublishModalOpen(true)}
              className="h-9 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 transition transform active:scale-95"
            >
              Publish
            </button>
          </div>

        </div>
      </div>

      {/* Editor Content Area */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10">
        <input
          type="text"
          placeholder="Notebook Title Goes here"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent text-2xl sm:text-3xl font-black placeholder:text-neutral-400 border-none focus:outline-none focus:ring-0 mb-4 sm:mb-6 text-neutral-900"
        />
        <div className="bg-white border border-neutral-200/80 shadow-xl shadow-neutral-200/50 rounded-xl sm:rounded-2xl p-4 sm:p-8 min-h-[350px] sm:min-h-[450px]">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Publish Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50 shrink-0">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-neutral-900" />
                <h3 className="text-sm font-bold text-neutral-900">Finalizing Your Notebook</h3>
              </div>
              <button onClick={() => setIsPublishModalOpen(false)} className="p-1 rounded-md text-neutral-400 hover:text-neutral-900"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Snapshot</span>
                </label>
                <textarea
                  placeholder="Provide a compelling brief summary line for the feeds..."
                  value={snapshot}
                  onChange={(e) => setSnapshot(e.target.value)}
                  maxLength={160}
                  className="w-full text-xs p-2.5 min-h-[76px] rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-400 resize-none text-neutral-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>Notebook Thumbnail</span>
                </label>

                {coverImageUrl ? (
                  <div className="relative rounded-lg border aspect-[2/1] bg-neutral-50 overflow-hidden group">
                    <img src={coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-neutral-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150">
                      <button type="button" onClick={() => setCoverImageUrl("")} className="p-1.5 rounded-md bg-rose-600 text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-neutral-200 aspect-[2/1] bg-neutral-50 flex flex-col items-center justify-center gap-2 text-neutral-400 hover:bg-neutral-100/50 transition duration-150"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-xs font-semibold">Set Feed Thumbnail</span>
                  </button>
                )}
              </div>

              {/* Collaborator invite section */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Invite Collaborators (optional)</span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={collabQuery}
                    onChange={(e) => handleCollabSearchChange(e.target.value)}
                    placeholder="Search by @handle..."
                    className="w-full text-xs p-2.5 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-400 text-neutral-800"
                  />
                  {collabQuery.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {collabSearching ? (
                        <p className="text-xs text-neutral-400 p-2.5">Searching...</p>
                      ) : collabResults.length === 0 ? (
                        <p className="text-xs text-neutral-400 p-2.5">No matching users</p>
                      ) : (
                        collabResults.map((ping) => (
                          <button
                            key={ping.$id}
                            type="button"
                            onClick={() => handleAddCollaborator(ping)}
                            className="w-full text-left px-2.5 py-2 text-xs hover:bg-neutral-50 transition"
                          >
                            @{ping.handle}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedCollaborators.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedCollaborators.map((c, index) => {
                      const gradients = [
                        "from-blue-400 to-indigo-500",
                        "from-emerald-400 to-teal-500",
                        "from-purple-400 to-pink-500",
                        "from-amber-400 to-orange-500"
                      ];
                      const dotGradient = gradients[index % gradients.length];

                      return (
                        <span
                          key={c.$id}
                          className="flex items-center gap-1.5 text-xs font-medium bg-blue-50/80 border border-blue-100 text-blue-900 rounded-full pl-2 pr-1.5 py-1"
                        >
                          <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${dotGradient} shadow-sm shrink-0`} />
                          @{c.handle}
                          <button
                            type="button"
                            onClick={() => handleRemoveCollaborator(c.$id)}
                            className="p-0.5 rounded-full hover:bg-blue-200/60 text-blue-700 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsPublishModalOpen(false)} className="h-8 px-4 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-md text-xs font-semibold">
                  Back
                </button>
                <button
                  type="button"
                  onClick={executePublishPipeline}
                  disabled={publishing}
                  className="h-8 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm disabled:opacity-50 transition"
                >
                  {publishing ? "Saving..." : "Final Publish"}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}