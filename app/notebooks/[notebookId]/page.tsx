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
    
    // Get the notebook's actual preview image from the database
    const rawImage = notebook?.preview_image_url;
    
    // Ensure the image URL is absolute (handles relative paths or full URLs)
    const imageUrl = rawImage 
      ? (rawImage.startsWith("http") ? rawImage : `https://joinping.up.railway.app${rawImage}`)
      : "https://joinping.up.railway.app/og-default.png"; // Fallback if no preview image exists

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