"use client";

import { useState, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading2, List, ImageIcon, Upload, FileText, Globe, X, Camera,  Heart, Send, Trash2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { uploadNotebookCoverImage, getNotebookCoverImageUrl, createNotebook, createChapter,checkIsLiked, getLikeCount, likeChapter, unlikeChapter,
  createComment, getCommentsForChapter, deleteComment, getPingByUserId } from "@/lib/appwrite";



export default function CreateNotebookPage() {
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Onboarding metadata states
  const [snapshot, setSnapshot] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);


  //commenting and linking states
  const [currentUser, setCurrentUser] = useState<any>(null);
const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
const [likeId, setLikeId] = useState<string | null>(null);
const [likeCount, setLikeCount] = useState(0);
const [likeLoading, setLikeLoading] = useState(false);
const [comments, setComments] = useState<any[]>([]);
const [newComment, setNewComment] = useState("");
const [postingComment, setPostingComment] = useState(false);

  // Initialize Tiptap safely with immediatelyRender set to false to clear hydration warnings
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Prevent duplicate conflicts if your version of StarterKit includes it
        underline: false, 
      }),
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
    content: "<p>Start writing your thoughts here...</p>",
    editorProps: {
      attributes: {
        class: "prose focus:outline-none min-h-[400px] max-w-none text-neutral-800",
      },
    },
  });

  const addLocalImageViaUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    try {
      const fileId = await uploadNotebookCoverImage(file);
      const publicUrl = getNotebookCoverImageUrl(fileId);
      editor.chain().focus().setImage({ src: publicUrl }).run();
      e.target.value = ''; 
    } catch (err) {
      console.error("Image insertion failure:", err);
    }
  };

  const handleCoverImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) {
    console.log("No file selected in file input.");
    return;
  }

  console.log("Locally selected file target discovered:", {
    name: file.name,
    size: file.size,
    type: file.type
  });

  try {
    // 1. Send file object to Appwrite Storage
    const fileId = await uploadNotebookCoverImage(file);
    console.log("Appwrite Storage upload success! Generated File ID:", fileId);
    
    // 2. Map file ID into public asset URL
    const publicUrl = getNotebookCoverImageUrl(fileId);
    console.log("Public URL successfully generated from helper:", publicUrl);

    if (!publicUrl) {
      throw new Error("getNotebookCoverImageUrl returned an empty string.");
    }

    // 3. Save to component state
    setCoverImageUrl(publicUrl);
  } catch (err: any) {
    console.error("CRITICAL UPLOAD PIPELINE FAILURE:", err);
    // This alert will show you the exact error string from Appwrite
    alert(`Upload Failed: ${err?.message || err}`);
  }
};
  // Direct programmatic execution (No form interferences)
 const executePublishPipeline = async () => {
  if (!title.trim()) return alert("Please specify a notebook title first.");
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
    <main className="min-h-[calc(100vh-56px)] bg-neutral-50/40 pb-20">
      
      <input type="file" accept="image/*" id="tiptap-image-upload" className="hidden" onChange={addLocalImageViaUpload} />
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleCoverImageUpload} />

      {/* TOOLBAR HEADER */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
            <button onClick={() => editor?.chain().focus().toggleBold().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600"><Bold className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().toggleItalic().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600"><Italic className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600"><UnderlineIcon className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().toggleStrike().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600"><Strikethrough className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-neutral-200 mx-1" />
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600"><Heading2 className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className="p-1.5 rounded-md hover:bg-white text-neutral-600"><List className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-neutral-200 mx-1" />
            <label htmlFor="tiptap-image-upload" className="p-1.5 rounded-md text-neutral-600 hover:bg-white cursor-pointer"><ImageIcon className="w-4 h-4" /></label>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium cursor-pointer">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded text-neutral-900 focus:ring-0" />
              <span>Public Stream</span>
            </label>
            <button onClick={() => setIsPublishModalOpen(true)} className="h-8 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-semibold shadow-sm transition">
              Publish Notebook
            </button>
          </div>

        </div>
      </div>

      {/* TITLE & EDITOR WORKSPACE */}
      <div className="max-w-2xl mx-auto px-6 mt-10">
        <input 
          type="text"
          placeholder="Notebook Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent text-3xl font-black placeholder:text-neutral-200 border-none focus:outline-none focus:ring-0 mb-6 text-neutral-900"
        />
        <div className="bg-white border border-neutral-200 shadow-sm rounded-xl p-6 sm:p-8 min-h-[450px]">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* METADATA ONBOARDING MODAL OVERLAY */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            
            <div className="px-5 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-neutral-900" />
                <h3 className="text-sm font-bold text-neutral-900">Finalizing Metadata</h3>
              </div>
              <button onClick={() => setIsPublishModalOpen(false)} className="p-1 rounded-md text-neutral-400 hover:text-neutral-900"><X className="w-4 h-4" /></button>
            </div>

            {/* Changed from <form> to a clean simple <div> container */}
            <div className="p-5 space-y-4 flex-1">
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Snapshot / Subheading</span>
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
                  <span>Notebook Thumbnail (pre_img)</span>
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
                    <span className="text-xs font-semibold">Set Feed Thumbnail (pre_img)</span>
                  </button>
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
                  className="h-8 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {publishing ? "Saving Archive..." : "Final Publish & Broadcast"}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}