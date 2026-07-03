"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function Editor({
  content,
  onChange,
  editable = true,
}: {
  content?: string;
  onChange?: (json: object) => void;
  editable?: boolean;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content ? JSON.parse(content) : "",
    editable,
    immediatelyRender: false,
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