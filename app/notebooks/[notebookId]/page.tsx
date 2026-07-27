import { Metadata } from "next";
import { getNotebook } from "@/lib/appwrite";
import * as NotebookClientModule from "@/components/NotebookClient";

// Safely resolve whether NotebookClient uses default or named export
const NotebookClient = 
  (NotebookClientModule as any).default || 
  (NotebookClientModule as any).NotebookClient;

interface PageProps {
  params: Promise<{ notebookId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { notebookId } = await params;
  
  try {
    const notebook = await getNotebook(notebookId);
    const title = notebook?.title || "How I'm Building Ping";
    const description = notebook?.snapshot || notebook?.description || "Sharing notes and reflections on building ping";
    
    const imageUrl = `https://joinping.up.railway.app/notebooks/${notebookId}/opengraph-image`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://joinping.up.railway.app/notebooks/${notebookId}`,
        siteName: "Ping",
        images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch {
    return {
      title: "Ping Notebook",
      description: "Sharing notes and reflections",
    };
  }
}

export default async function Page({ params }: PageProps) {
  const { notebookId } = await params;

  if (!NotebookClient) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>Configuration Error</h2>
        <p>Could not load NotebookClient component. Check your export statement in <code>components/NotebookClient.tsx</code>.</p>
      </div>
    );
  }

  return <NotebookClient notebookId={notebookId} />;
}