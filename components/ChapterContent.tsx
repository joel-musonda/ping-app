"use client";

import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";

const extensions = [
  StarterKit,
  Underline,
  ImageExtension,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];

export default function ChapterContent({ contentJson }: { contentJson: string | undefined }) {
  if (!contentJson) {
    return (
      <p className="italic text-neutral-400">
        This chapter contains no written content text yet.
      </p>
    );
  }

  let json;
  try {
    json = JSON.parse(contentJson);
  } catch {
    return (
      <p className="italic text-neutral-400">
        This chapter contains no written content text yet.
      </p>
    );
  }

  let html = "";
  try {
    html = generateHTML(json, extensions);
  } catch (err) {
    console.error("Failed to render chapter content:", err);
    return (
      <p className="italic text-neutral-400">
        This chapter's content couldn't be displayed.
      </p>
    );
  }

  return (
    <div
      className="prose prose-lg prose-neutral dark:prose-invert max-w-none text-neutral-900 dark:text-neutral-100 tracking-normal leading-relaxed break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}