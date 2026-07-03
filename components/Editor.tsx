'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { databases } from '@/lib/appwrite';
import { useState } from 'react';
import { ID } from 'appwrite';

export default function Editor({ chapterId }: { chapterId: string }) {
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<h2>Welcome to Ping</h2><p>Start syncing your concepts directly into your cloud repository...</p>',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[250px] p-4 text-black bg-white prose max-w-none',
      },
    },
  });

  const persistToAppwrite = async () => {
    if (!editor) return;
    setSaving(true);
    
    const jsonTree = JSON.stringify(editor.getJSON());

    try {
      await databases.createDocument(
        '6a4682b300067939b8a5', 
        'chapters',            
        ID.unique(),           
        { 
          title: "Test Draft",
          content_json: jsonTree,
          order_index: 1,
          notebook_id: "test-notebook-123",
          is_published: false
        }
      );
      alert('Success! Data pipeline confirmed. Check your Appwrite Dashboard.');
    } catch (error) {
      console.error('Appwrite connection failure:', error);
      alert('Pipeline failed. Check browser inspection console.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 w-full mt-4 text-left">
      <div className="border border-neutral-300 rounded-lg bg-white shadow-sm overflow-hidden">
        <EditorContent editor={editor} />
      </div>
      <button 
        onClick={persistToAppwrite}
        disabled={saving}
        className="px-5 py-2.5 bg-neutral-900 text-white rounded-md font-semibold hover:bg-neutral-800 disabled:opacity-50 transition shadow"
      >
        {saving ? 'Syncing to Cloud...' : 'Save Milestone'}
      </button>
    </div>
  );
}