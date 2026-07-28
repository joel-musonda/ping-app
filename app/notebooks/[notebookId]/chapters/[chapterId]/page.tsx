"use client";

import { useEffect, useState, useRef, ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { toast } from "@heroui/react";
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
  Heading2, List, ImageIcon, ArrowLeft, CloudLightning, 
  Bookmark, MessageSquare, Trash2, Heart, Link as LinkIcon, Quote, Code,
  AlignLeft, AlignCenter, AlignRight, X, Upload, GripVertical, ExternalLink, Check
} from "lucide-react";

// Initialize Lowlight with common languages for auto language recognition & highlighting
const lowlight = createLowlight(common);

// Custom Code Block Node Component with Auto-Detect + Language Dropdown + Drag Handle
const CodeBlockComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const selectedLanguage = node.attrs.language || "auto";

  return (
    <NodeViewWrapper className="relative my-6 rounded-xl bg-[#0d1117] text-[#c9d1d9] border border-neutral-800 p-4 font-mono text-xs sm:text-sm shadow-md group">
      {/* Header Bar: Drag Handle & Language Selector */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
        {/* Drag Handle */}
        <div
          data-drag-handle
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 pointer-events-auto transition opacity-0 group-hover:opacity-100 flex items-center gap-1"
          title="Drag to reorder code block"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Language Selector Dropdown */}
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
        <NodeViewContent  className="font-mono" />
      </pre>
    </NodeViewWrapper>
  );
};

// Extend CodeBlockLowlight to make it Draggable and use custom React Node View
const CustomCodeBlock = CodeBlockLowlight.extend({
  draggable: true,
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
}).configure({
  lowlight,
});

export default function ChapterWorkspacePage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  // Focus & Link Popover State
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [linkInputUrl, setLinkInputUrl] = useState("");

  // Preview Image & Onboarding Card State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  // Reader Telemetry State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [likeId, setLikeId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [currentUserHandle, setCurrentUserHandle] = useState<string | null>(null);

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
        placeholder: "Your chapter content starts here...",
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
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose focus:outline-none min-h-[350px] sm:min-h-[450px] max-w-none text-neutral-800 " +
          "[&_.is-editor-empty:first-child::before]:text-neutral-400/70 " +
          "[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] " +
          "[&_.is-editor-empty:first-child::before]:float-left " +
          "[&_.is-editor-empty:first-child::before]:pointer-events-none " +
          "[&_.is-editor-empty:first-child::before]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] " +
          "[&_.is-editor-empty:first-child::before]:font-medium",
      },
    },
  });

  useEffect(() => {
    let cancelled = false;

    getChapter(chapterId)
      .then(async (chapter) => {
        if (cancelled) return;
        setTitle(chapter.title);
        setNotebookId(chapter.notebook_id);
        if (chapter.preview_image_url) {
          setPreviewImageUrl(chapter.preview_image_url);
        }

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
          
          const dynamicEditAccess = !!user && (
            user.$id === notebook.owner_id || 
            (notebook.collaborator_ids && notebook.collaborator_ids.includes(user.$id))
          );
          
          setCanEdit(dynamicEditAccess);

          if (dynamicEditAccess) {
            editor?.setEditable(true);
            setLoading(false);
            return;
          }

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
          setCanEdit(false);
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
    if (!file || !editor || !canEdit) return;

    setStatus("Uploading image...");
    try {
      const fileId = await uploadNotebookCoverImage(file);
      const publicUrl = getNotebookCoverImageUrl(fileId);
      
      editor.chain().focus().setImage({ src: publicUrl }).run();
      e.target.value = ''; 
      setStatus("");
    } catch (err) {
      console.error("Image insertion failure:", err);
      setStatus("Failed");
    }
  };

  const handlePreviewImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPreview(true);
    try {
      const fileId = await uploadNotebookCoverImage(file);
      const publicUrl = getNotebookCoverImageUrl(fileId);
      setPreviewImageUrl(publicUrl);
      toast("Preview image uploaded successfully");
    } catch (err) {
      console.error("Preview image upload failed:", err);
      toast("Failed to upload preview image");
    } finally {
      setUploadingPreview(false);
    }
  };

  const executePublish = async () => {
    setStatus("Publishing payload...");
    try {
      await updateChapter(chapterId, { 
        title: title.trim() || "Untitled Chapter",
        content_json: JSON.stringify(editor?.getJSON() ?? {}),
        preview_image_url: previewImageUrl || ""
      });
      toast("Successfully uploaded a chapter");
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

  const handlePublishClick = () => {
    if (!canEdit) return;
    setShowPreviewModal(true);
  };

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

  // Reusable formatting controls sub-component
  const FormattingControls = () => (
    <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar overscroll-contain py-1 sm:py-0 w-full">
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().toggleBold().run()} className="p-2 rounded-lg hover:bg-neutral-200/80 text-neutral-700 transition shrink-0" title="Bold"><Bold className="w-4 h-4" /></button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().toggleItalic().run()} className="p-2 rounded-lg hover:bg-neutral-200/80 text-neutral-700 transition shrink-0" title="Italic"><Italic className="w-4 h-4" /></button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().toggleUnderline().run()} className="p-2 rounded-lg hover:bg-neutral-200/80 text-neutral-700 transition shrink-0" title="Underline"><UnderlineIcon className="w-4 h-4" /></button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().toggleStrike().run()} className="p-2 rounded-lg hover:bg-neutral-200/80 text-neutral-700 transition shrink-0" title="Strikethrough"><Strikethrough className="w-4 h-4" /></button>
      <div className="w-px h-5 bg-neutral-300 mx-1 shrink-0" />
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="p-2 rounded-lg hover:bg-neutral-200/80 text-neutral-700 transition shrink-0" title="Heading"><Heading2 className="w-4 h-4" /></button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().toggleBulletList().run()} className="p-2 rounded-lg hover:bg-neutral-200/80 text-neutral-700 transition shrink-0" title="Bullet List"><List className="w-4 h-4" /></button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={handleToggleLinkPopover} className={`p-2 rounded-lg transition shrink-0 ${isLinkPopoverOpen ? "bg-neutral-200 text-blue-600" : "text-neutral-700 hover:bg-neutral-200/80"}`} title="Add Link"><LinkIcon className="w-4 h-4" /></button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().toggleBlockquote().run()} className="p-2 rounded-lg hover:bg-neutral-200/80 text-neutral-700 transition shrink-0" title="Quote"><Quote className="w-4 h-4" /></button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className={`p-2 rounded-lg transition shrink-0 ${editor?.isActive("codeBlock") ? "bg-neutral-200 text-blue-600" : "text-neutral-700 hover:bg-neutral-200/80"}`} title="Code Block"><Code className="w-4 h-4" /></button>
      <div className="w-px h-5 bg-neutral-300 mx-1 shrink-0" />
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().setTextAlign('left').run()} className="p-2 rounded-lg hover:bg-neutral-200/80 text-neutral-700 transition shrink-0" title="Align Left"><AlignLeft className="w-4 h-4" /></button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().setTextAlign('center').run()} className="p-2 rounded-lg hover:bg-neutral-200/80 text-neutral-700 transition shrink-0" title="Align Center"><AlignCenter className="w-4 h-4" /></button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().setTextAlign('right').run()} className="p-2 rounded-lg hover:bg-neutral-200/80 text-neutral-700 transition shrink-0" title="Align Right"><AlignRight className="w-4 h-4" /></button>
      <div className="w-px h-5 bg-neutral-300 mx-1 shrink-0" />
      <label htmlFor="tiptap-chapter-image-upload" className="p-2 rounded-lg text-neutral-700 hover:bg-neutral-200/80 cursor-pointer transition shrink-0" title="Upload Image"><ImageIcon className="w-4 h-4" /></label>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-xs text-neutral-400 font-medium tracking-wide bg-neutral-50/40">
        Loading canvas viewport...
      </div>
    );
  }

  // --- RENDER BLOCK A: EDITABLE WORKSPACE MODE ---
  if (canEdit) {
    return (
      <main className="min-h-[calc(100vh-56px)] bg-neutral-50/40 pb-20 sm:pb-20 relative">
        {/* GitHub Dark Syntax Highlighting Theme */}
        <style jsx global>{`
          .hljs-comment,
          .hljs-quote {
            color: #8b949e;
            font-style: italic;
          }
          .hljs-keyword,
          .hljs-selector-tag,
          .hljs-subst {
            color: #ff7b72;
            font-weight: 600;
          }
          .hljs-string,
          .hljs-title.class_,
          .hljs-section {
            color: #a5d6ff;
          }
          .hljs-title,
          .hljs-title.function_ {
            color: #d2a8ff;
          }
          .hljs-number,
          .hljs-literal {
            color: #79c0ff;
          }
          .hljs-variable,
          .hljs-template-variable {
            color: #ffa657;
          }
          .hljs-tag,
          .hljs-name {
            color: #7ee787;
          }
          .hljs-attr,
          .hljs-attribute {
            color: #79c0ff;
          }
          .hljs-built_in,
          .hljs-type {
            color: #ffa657;
          }
        `}</style>

        <input 
          type="file" 
          accept="image/*" 
          id="tiptap-chapter-image-upload" 
          className="hidden" 
          onChange={addLocalImageViaUpload} 
        />

        <input 
          type="file" 
          accept="image/*" 
          id="chapter-preview-image-upload" 
          className="hidden" 
          onChange={handlePreviewImageUpload} 
        />

        {/* RESPONSIVE OPTIONAL PREVIEW IMAGE ONBOARDING MODAL */}
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Chapter Preview Image</h3>
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:bg-neutral-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-500 leading-relaxed">
                Add an optional cover image for your chapter card display in the library feed. You can skip this if you prefer.
              </p>

              {previewImageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-neutral-200 h-36 sm:h-40 bg-neutral-50">
                  <img src={previewImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setPreviewImageUrl(null)}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full text-xs transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label 
                  htmlFor="chapter-preview-image-upload"
                  className="border-2 border-dashed border-neutral-200 hover:border-neutral-300 rounded-xl h-32 sm:h-36 flex flex-col items-center justify-center gap-2 cursor-pointer bg-neutral-50/50 transition group"
                >
                  <div className="p-2 rounded-full bg-white shadow-sm text-neutral-500 group-hover:scale-105 transition">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-neutral-600">
                    {uploadingPreview ? "Uploading preview..." : "Upload optional preview image"}
                  </span>
                </label>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    executePublish();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
                >
                  Confirm & Publish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unified Sticky Top Toolbar */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-sm w-full transition-all duration-200">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 relative">
            
            {/* Action Row - Top on mobile, Right on desktop */}
            <div className="flex items-center justify-between sm:justify-end gap-4 order-1 sm:order-2 w-full sm:w-auto shrink-0">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => router.back()}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 transition shrink-0"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium ml-2">
                  {status === "Publishing payload..." ? (
                    <span className="flex items-center gap-1 text-amber-500 animate-pulse">
                      <CloudLightning className="w-3.5 h-3.5" /> Publishing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-neutral-400"><Bookmark className="w-3.5 h-3.5" /> Draft Ready</span>
                  )}
                </div>
              </div>

              <button 
                onClick={handlePublishClick}
                className="h-9 px-5 bg-[#0084FF] hover:bg-[#0073e6] active:bg-[#0062c4] text-white rounded-lg text-sm font-bold shadow-sm transition transform active:scale-95 shrink-0"
              >
               Done
              </button>
            </div>

            {/* Formatting Controls - Bottom on mobile, Left on desktop */}
            <div className="flex items-center w-full order-2 sm:order-1 bg-neutral-50 sm:bg-transparent rounded-lg px-1 sm:px-0 border border-neutral-200 sm:border-none">
              <FormattingControls />
            </div>

            {/* Link Popover - Dropdown from the sticky header */}
            {isLinkPopoverOpen && (
              <div className="absolute left-3 right-3 sm:left-6 sm:right-auto top-[calc(100%+8px)] z-50 max-w-sm p-2 bg-white border border-neutral-200 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <div className="px-2 text-neutral-400"><ExternalLink className="w-4 h-4" /></div>
                <input
                  type="text"
                  placeholder="Paste or type a link..."
                  value={linkInputUrl}
                  onChange={(e) => setLinkInputUrl(e.target.value)}
                  autoFocus
                  className="flex-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-neutral-800"
                />
                <button type="button" onClick={handleApplyLink} className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition">
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply</span>
                </button>
                {editor?.isActive("link") && (
                  <button type="button" onClick={handleRemoveLink} className="h-8 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold transition">
                    Unlink
                  </button>
                )}
                <button type="button" onClick={() => setIsLinkPopoverOpen(false)} className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* WORKSPACE AREA - BORDERLESS / INFINITE FEEL */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chapter Title"
            className="w-full bg-transparent text-2xl sm:text-3xl font-black placeholder:text-neutral-300 border-none focus:outline-none focus:ring-0 mb-4 sm:mb-6 text-neutral-900 tracking-tight"
          />
          <div className="min-h-[350px] sm:min-h-[450px]">
            <EditorContent editor={editor} />
          </div>
        </div>
      </main>
    );
  }

  // --- RENDER BLOCK B: PUBLIC READ FORMAT CANVAS ---
  return (
    <main className="py-6 max-w-2xl mx-auto px-4 space-y-8">
      {/* GitHub Dark Syntax Highlighting Theme for Readers */}
      <style jsx global>{`
        .hljs-comment,
        .hljs-quote {
          color: #8b949e;
          font-style: italic;
        }
        .hljs-keyword,
        .hljs-selector-tag,
        .hljs-subst {
          color: #ff7b72;
          font-weight: 600;
        }
        .hljs-string,
        .hljs-title.class_,
        .hljs-section {
          color: #a5d6ff;
        }
        .hljs-title,
        .hljs-title.function_ {
          color: #d2a8ff;
        }
        .hljs-number,
        .hljs-literal {
          color: #79c0ff;
        }
        .hljs-variable,
        .hljs-template-variable {
          color: #ffa657;
        }
        .hljs-tag,
        .hljs-name {
          color: #7ee787;
        }
        .hljs-attr,
        .hljs-attribute {
          color: #79c0ff;
        }
        .hljs-built_in,
        .hljs-type {
          color: #ffa657;
        }
      `}</style>

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