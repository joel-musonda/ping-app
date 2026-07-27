import { Metadata } from "next";
import { getNotebook } from "@/lib/appwrite";
import NotebookClient from "@/components/NotebookClient";

interface PageProps {
  params: Promise<{ notebookId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { notebookId } = await params;
  
  try {
    const notebook = await getNotebook(notebookId);
    const title = notebook?.title || "Notebook on Ping";
    const description = notebook?.snapshot || notebook?.description || "Explore this notebook on Ping.";
    
    // Explicitly reference the absolute URL of your opengraph-image route
    const imageUrl = `https://joinping.up.railway.app/notebooks/${notebookId}/opengraph-image`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://joinping.up.railway.app/notebooks/${notebookId}`,
        siteName: "Ping",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
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
      title: "Notebook on Ping",
      description: "Explore this notebook on Ping.",
    };
  }
}

export default async function Page({ params }: PageProps) {
  const { notebookId } = await params;
  return <NotebookClient notebookId={notebookId} />;
}