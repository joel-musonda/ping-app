// app/page.tsx
import Editor from "@/components/Editor";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold tracking-tight mb-8 text-neutral-950">
          Ping Workspace
        </h1>
        {/* We hardcode a test ID for now just to prove the pipeline works */}
        <Editor chapterId="test-chapter-123" />
      </div>
    </main>
  );
}