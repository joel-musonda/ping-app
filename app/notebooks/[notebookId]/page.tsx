import { Metadata } from "next";
import { getNotebook, getChaptersForNotebook } from "@/lib/appwrite";
import NotebookClient from "@/components/NotebookClient";

interface PageProps {
  params: Promise<{ notebookId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { notebookId } = await params;
  try {
    const notebook = await getNotebook(notebookId);
    
    // Ensure the image URL is absolute. Fall back to a default site banner if none exists.
    const rawImage = notebook.preview_image_url;
    const imageUrl = rawImage 
      ? (rawImage.startsWith("http") ? rawImage : `${process.env.NEXT_PUBLIC_SITE_URL || "https://joinping.up.railway.app"}${rawImage}`)
      : "https://joinping.up.railway.app/og-default.png"; // Replace with your default fallback image

    const title = notebook.title || "Notebook";
    const description = notebook.snapshot || notebook.description || "Explore this notebook on Ping.";

    return {
      title: title, // Clean, single title
      description: description,
      openGraph: {
        title: title,
        description: description,
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
        title: title,
        description: description,
        images: [imageUrl],
      },
    };
  } catch {
    return {
      title: "Notebook",
      description: "Explore this notebook on Ping.",
    };
  }
}

export default async function Page({ params }: PageProps) {
  const { notebookId } = await params;
  return <NotebookClient notebookId={notebookId} />;
}