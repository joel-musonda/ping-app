"use client";

import { useState, useRef } from "react";
import { databases, DATABASE_ID, CHAPTERS_COLLECTION_ID } from "@/lib/appwrite";
import { ID } from "appwrite";
import Editor from "@/components/Editor";

export default function Home() {
  const [status, setStatus] = useState("");
  const documentIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveToAppwrite = async (json: object) => {
    try {
      if (documentIdRef.current) {
        // update the existing document
        await databases.updateDocument(
          DATABASE_ID,
          CHAPTERS_COLLECTION_ID,
          documentIdRef.current,
          { content_json: JSON.stringify(json) }
        );
      } else {
        // first save — create it once, remember the id
        const doc = await databases.createDocument(
          DATABASE_ID,
          CHAPTERS_COLLECTION_ID,
          ID.unique(),
          {
            title: "Test chapter",
            content_json: JSON.stringify(json),
            order_index: 0,
            notebook_id: "test",
            is_published: false,
          }
        );
        documentIdRef.current = doc.$id;
      }
      setStatus("Saved ✅");
    } catch (err) {
      console.error(err);
      setStatus("Failed ❌ — check console");
    }
  };

  const handleChange = (json: object) => {
    setStatus("Typing...");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => saveToAppwrite(json), 1000);
  };

  return (
    <main className="p-8">
      <Editor onChange={handleChange} />
      <p>{status}</p>
    </main>
  );
}