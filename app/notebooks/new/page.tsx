"use client";

import { useState, useRef, useEffect, ChangeEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useEditor,
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";

import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading2, List, ImageIcon, Upload, FileText, Globe, X, Camera, Trash2, Users,
  Link as LinkIcon, Quote, Code, Check, ExternalLink, GripVertical,
  AlignLeft, AlignCenter, AlignRight, Lock, Unlock, Undo2, Redo2, Minus, Moon, Sun
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  uploadNotebookCoverImage, getNotebookCoverImageUrl, createNotebook, createChapter,
  getPingByUserId, searchPingsByHandle, inviteCollaborator
} from "@/lib/appwrite";

// Initialize Lowlight with common languages for auto language recognition & highlighting
const lowlight = createLowlight(common);

// Custom Image Component with Reference Text Field Support
const ImageWithCaptionComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const { src, caption } = node.attrs;

  return (
    <NodeViewWrapper className="my-6 max-w-full flex flex-col items-center">
      <div className="relative group rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm max-h-[300px] sm:max-h-[400px]">
        <img src={src} alt="" className="w-auto h-auto max-h-[300px] sm:max-h-[400px] object-cover mx-auto" />
      </div>
      <input
        type="text"
        contentEditable={false}
        placeholder="Type a reference or caption for this image..."
        value={caption || ""}
        onChange={(e) => updateAttributes({ caption: e.target.value })}
        className="mt-2 w-full max-w-md text-center text-xs text-neutral-500 dark:text-neutral-400 bg-transparent border-b border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 focus:border-neutral-400 dark:focus:border-neutral-500 focus:outline-none py-1 placeholder:text-neutral-400/70 transition"
      />
    </NodeViewWrapper>
  );
};

const CustomImageExtension = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: "",
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageWithCaptionComponent);
  },
});

// Custom Code Block Node Component with Auto-Detect + Language Dropdown + Drag Handle
const CodeBlockComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const selectedLanguage = node.attrs.language || "auto";

  return (
    <NodeViewWrapper className="relative my-6 rounded-xl bg-[#0d1117] text-[#c9d1d9] border border-neutral-800 p-4 font-mono text-xs sm:text-sm shadow-md group">
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
        <div
          data-drag-handle
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 pointer-events-auto transition opacity-0 group-hover:opacity-100 flex items-center gap-1"
          title="Drag to reorder code block"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="pointer-events-auto">
          <select
            contentEditable={false}
            value={selectedLanguage}
            onChange={(e) => {
              const val = e.target.value;
              updateAttributes({ language: val === "auto" ? null : val });
            }}
            className="bg-neutral-800/90 text-neutral-300 hover:text-white border border-neutral-700 text-[11px] font-sans font-medium rounded-md px-2 py-0.5 shadow-sm focus:outline-none cursor-pointer transition"
          >
            <option value="auto">Auto-detect</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
            <option value="bash">Bash / Shell</option>
            <option value="sql">SQL</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
          </select>
        </div>
      </div>
      <pre className="overflow-x-auto pt-7 sm:pt-6 font-mono leading-relaxed selection:bg-neutral-700">
        <NodeViewContent className="font-mono" />
      </pre>
    </NodeViewWrapper>
  );
};

const CustomCodeBlock = CodeBlockLowlight.extend({
  draggable: true,
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
}).configure({
  lowlight,
});

export default function CreateNotebookPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [snapshot, setSnapshot] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [linkInputUrl, setLinkInputUrl] = useState("");

  const [collabQuery, setCollabQuery] = useState("");
  const [collabResults, setCollabResults] = useState<any[]>([]);
  const [collabSearching, setCollabSearching] = useState(false);
  const [selectedCollaborators, setSelectedCollaborators] = useState<any[]>([]);
  const collabTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ 
        underline: false,
        codeBlock: false,
      }),
      CustomCodeBlock,
      Underline,
      Placeholder.configure({
        placeholder: "Your thoughts come here...",
        emptyEditorClass: "is-editor-empty",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-600 dark:text-blue-400 underline cursor-pointer" },
      }),
      CustomImageExtension,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert focus:outline-none min-h-[60vh] max-w-none text-neutral-800 dark:text-neutral-100 " +
          "[&_.is-editor-empty:first-child::before]:text-neutral-400/70 " +
          "[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] " +
          "[&_.is-editor-empty:first-child::before]:float-left " +
          "[&_.is-editor-empty:first-child::before]:pointer-events-none " +
          "[&_.is-editor-empty:first-child::before]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] " +
          "[&_.is-editor-empty:first-child::before]:font-medium",
      },
    },
  });

  const handleToggleLinkPopover = () => {
    if (!editor) return;
    const existingUrl = editor.getAttributes("link").href || "";
    setLinkInputUrl(existingUrl);
    setIsLinkPopoverOpen((prev) => !prev);
  };

  const handleApplyLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editor) return;

    if (linkInputUrl.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const formattedUrl = linkInputUrl.startsWith("http://") || linkInputUrl.startsWith("https://")
        ? linkInputUrl.trim()
        : `https://${linkInputUrl.trim()}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: formattedUrl }).run();
    }
    setIsLinkPopoverOpen(false);
  };

  const handleRemoveLink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkInputUrl("");
    setIsLinkPopoverOpen(false);
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
    if (!title.trim()) return alert("Please specify a notebook title first.");
    if (!category.trim()) return alert("Please specify a category.");
    if (!snapshot.trim()) return alert("A snapshot description summary is required.");
    if (!coverImageUrl) return alert("Please select a cover thumbnail image before publishing.");

    setPublishing(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("User session not found. Please log in again.");

      const notebook = await createNotebook(
        user.$id,
        title.trim(),
        category.trim(),
        isPublic, 
        snapshot.trim(),
        coverImageUrl.trim()
      );
      const targetNotebookId = notebook.$id;

      const contentJson = editor?.getJSON() ?? {};
      await createChapter(
        targetNotebookId,
        user.$id,
        true,
        title.trim(),
        JSON.stringify(contentJson),
        0
      );

      if (selectedCollaborators.length > 0) {
        try {
          const ownerProfile = await getPingByUserId(user.$id);
          for (const c of selectedCollaborators) {
            await inviteCollaborator(
              targetNotebookId,
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
      window.location.href = `/notebooks/${targetNotebookId}`;
    } catch (err: any) {
      console.error("CRITICAL BACKEND WRITE ERROR:", err);
      alert(`Appwrite Error: ${err?.message || err}`);
    } finally {
      setPublishing(false);
    }
  };

  const FormattingControls = () => (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar overscroll-contain py-1 sm:py-0 w-full">
      {/* Pill 1: Text Styling */}
      <div className="flex items-center bg-neutral-100/90 dark:bg-neutral-800/90 rounded-full px-2 py-1 shadow-2xs shrink-0">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg transition shrink-0 ${editor?.isActive("bold") ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-bold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <div className="w-px h-3.5 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg transition shrink-0 ${editor?.isActive("italic") ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-bold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <div className="w-px h-3.5 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded-lg transition shrink-0 ${editor?.isActive("underline") ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-bold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-3.5 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded-lg transition shrink-0 ${editor?.isActive("strike") ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-bold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
      </div>

      {/* Pill 2: History & Layout */}
      <div className="flex items-center bg-neutral-100/90 dark:bg-neutral-800/90 rounded-full px-2 py-1 shadow-2xs shrink-0">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().undo().run()}
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition shrink-0"
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <div className="w-px h-3.5 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().redo().run()}
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition shrink-0"
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="w-px h-3.5 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().setHardBreak().run()}
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition shrink-0"
          title="Add Line with Space"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Pill 3: Structure & Blocks */}
      <div className="flex items-center bg-neutral-100/90 dark:bg-neutral-800/90 rounded-full px-2 py-1 shadow-2xs shrink-0">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded-lg transition shrink-0 ${editor?.isActive("heading", { level: 2 }) ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-bold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
          title="Heading"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <div className="w-px h-3.5 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-lg transition shrink-0 ${editor?.isActive("bulletList") ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-bold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <div className="w-px h-3.5 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded-lg transition shrink-0 ${editor?.isActive("blockquote") ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-bold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <div className="w-px h-3.5 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          className={`p-1.5 rounded-lg transition shrink-0 ${editor?.isActive("codeBlock") ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-bold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </button>
      </div>

      {/* Pill 4: Alignment & Links & Media */}
      <div className="flex items-center bg-neutral-100/90 dark:bg-neutral-800/90 rounded-full px-2 py-1 shadow-2xs shrink-0">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          className={`p-1.5 rounded-lg transition shrink-0 ${editor?.isActive({ textAlign: "left" }) ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-bold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <div className="w-px h-3.5 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          className={`p-1.5 rounded-lg transition shrink-0 ${editor?.isActive({ textAlign: "center" }) ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-bold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <div className="w-px h-3.5 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          className={`p-1.5 rounded-lg transition shrink-0 ${editor?.isActive({ textAlign: "right" }) ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-bold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <div className="w-px h-3.5 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleToggleLinkPopover}
          className={`p-1.5 rounded-lg transition shrink-0 ${isLinkPopoverOpen || editor?.isActive("link") ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-bold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
          title="Add Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-3.5 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />
        <label
          htmlFor="tiptap-image-upload"
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer transition shrink-0"
          title="Upload Image"
        >
          <ImageIcon className="w-4 h-4" />
        </label>
      </div>
    </div>
  );

  return (
    <main className={`min-h-screen pb-32 transition-colors duration-200 ${darkMode ? "dark bg-neutral-950 text-neutral-100" : "bg-white text-neutral-900"}`}>
      <style jsx global>{`
        .hljs-comment, .hljs-quote { color: #8b949e; font-style: italic; }
        .hljs-keyword, .hljs-selector-tag, .hljs-subst { color: #ff7b72; font-weight: 600; }
        .hljs-string, .hljs-title.class_, .hljs-section { color: #a5d6ff; }
        .hljs-title, .hljs-title.function_ { color: #d2a8ff; }
        .hljs-number, .hljs-literal { color: #79c0ff; }
        .hljs-variable, .hljs-template-variable { color: #ffa657; }
        .hljs-tag, .hljs-name { color: #7ee787; }
        .hljs-attr, .hljs-attribute { color: #79c0ff; }
        .hljs-built_in, .hljs-type { color: #ffa657; }
      `}</style>

      <input type="file" accept="image/*" id="tiptap-image-upload" className="hidden" onChange={addLocalImageViaUpload} />
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleCoverImageUpload} />

      {/* Unified Sticky Top Toolbar */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 shadow-sm w-full transition-all duration-200">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 relative">
          
          <div className="flex items-center justify-between sm:justify-end gap-3 order-1 sm:order-2 w-full sm:w-auto shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="h-9 w-9 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg transition transform active:scale-95"
                title="Toggle Dark Mode"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {}}
                className="h-9 px-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-sm font-semibold transition transform active:scale-95"
              >
                Save as Draft
              </button>
              <button
                onClick={() => setIsPublishModalOpen(true)}
                className="h-9 px-5 bg-[#0084FF] hover:bg-[#0073e6] active:bg-[#0062c4] text-white rounded-lg text-sm font-bold shadow-sm transition transform active:scale-95"
              >
                Done
              </button>
            </div>
          </div>

          <div className="flex items-center w-full order-2 sm:order-1 rounded-lg px-1 sm:px-0">
            <FormattingControls />
          </div>

          {isLinkPopoverOpen && (
            <div className="absolute left-3 right-3 sm:left-6 sm:right-auto top-[calc(100%+8px)] z-50 max-w-sm p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <div className="px-2 text-neutral-400"><ExternalLink className="w-4 h-4" /></div>
              <input
                type="text"
                placeholder="Paste or type a link..."
                value={linkInputUrl}
                onChange={(e) => setLinkInputUrl(e.target.value)}
                autoFocus
                className="flex-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-neutral-800 dark:text-neutral-100"
              />
              <button type="button" onClick={handleApplyLink} className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition">
                <Check className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
              {editor?.isActive("link") && (
                <button type="button" onClick={handleRemoveLink} className="h-8 px-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold transition">
                  Unlink
                </button>
              )}
              <button type="button" onClick={() => setIsLinkPopoverOpen(false)} className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="max-w-3xl mx-auto px-4 sm:px-8 mt-6 sm:mt-10">
        <input
          type="text"
          placeholder="Notebook Title Goes here"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent text-3xl sm:text-4xl font-black placeholder:text-neutral-300 dark:placeholder:text-neutral-700 border-none focus:outline-none focus:ring-0 mb-6 sm:mb-8 text-neutral-900 dark:text-neutral-100 tracking-tight"
        />
        <EditorContent editor={editor} />
      </div>

      {/* Publish / Onboarding Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-[60] bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50 shrink-0">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Publishing Your Notebook</h3>
              </div>
              <button onClick={() => setIsPublishModalOpen(false)} className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  <span>Visibility</span>
                </label>
                <div className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                  <div className="flex items-center gap-2.5">
                    {isPublic ? (
                      <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {isPublic ? "Public Notebook" : "Private Notebook"}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {isPublic ? "Anyone can discover and view this notebook" : "Only you and invited collaborators can view"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isPublic ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  >
                    <span
                      className={`pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                        isPublic ? "translate-x-5" : "translate-x-0"
                      }`}
                    >
                      {isPublic ? (
                        <Check className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                      )}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Category</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technology, Design, Engineering..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 focus:bg-white dark:focus:bg-neutral-800 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-neutral-800 dark:text-neutral-100"
                />
              </div>

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
                  className="w-full text-sm p-3 min-h-[80px] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 focus:bg-white dark:focus:bg-neutral-800 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 resize-none text-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>Notebook Thumbnail</span>
                </label>

                {coverImageUrl ? (
                  <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 aspect-[2/1] bg-neutral-50 dark:bg-neutral-800 overflow-hidden group">
                    <img src={coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-neutral-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150">
                      <button type="button" onClick={() => setCoverImageUrl("")} className="p-2 rounded-lg bg-rose-600 text-white"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 aspect-[2/1] bg-neutral-50/50 dark:bg-neutral-800/30 flex flex-col items-center justify-center gap-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition duration-150"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-sm font-semibold">Set Feed Thumbnail</span>
                  </button>
                )}
              </div>

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
                    className="w-full text-sm p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 focus:bg-white dark:focus:bg-neutral-800 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-neutral-800 dark:text-neutral-100"
                  />
                  {collabQuery.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {collabSearching ? (
                        <p className="text-sm text-neutral-400 p-3">Searching...</p>
                      ) : collabResults.length === 0 ? (
                        <p className="text-sm text-neutral-400 p-3">No matching users</p>
                      ) : (
                        collabResults.map((ping) => (
                          <button
                            key={ping.$id}
                            type="button"
                            onClick={() => handleAddCollaborator(ping)}
                            className="w-full text-left px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
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
                      const gradients = ["from-blue-400 to-indigo-500", "from-emerald-400 to-teal-500", "from-purple-400 to-pink-500", "from-amber-400 to-orange-500"];
                      const dotGradient = gradients[index % gradients.length];

                      return (
                        <span key={c.$id} className="flex items-center gap-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 text-blue-900 dark:text-blue-300 rounded-full pl-2.5 pr-1.5 py-1.5">
                          <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${dotGradient} shadow-sm shrink-0`} />
                          @{c.handle}
                          <button type="button" onClick={() => handleRemoveCollaborator(c.$id)} className="p-0.5 rounded-full hover:bg-blue-200/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 transition">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsPublishModalOpen(false)} className="h-10 px-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-sm font-semibold transition">
                  Back
                </button>
                <button
                  type="button"
                  onClick={executePublishPipeline}
                  disabled={publishing}
                  className="h-10 px-6 bg-[#0084FF] hover:bg-[#0073e6] active:bg-[#0062c4] text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50 transition"
                >
                  {publishing ? "Publishing..." : "Publish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}