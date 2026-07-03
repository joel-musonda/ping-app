"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function Editor({
  content,
  onChange,
}: {
  content?: string;
  onChange?: (json: object) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content ? JSON.parse(content) : "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
  });

 return (
  <EditorContent
    editor={editor}
    className="tiptap min-h-[200px] w-full max-w-2xl border border-gray-400 rounded-md p-4"
  />
);
}