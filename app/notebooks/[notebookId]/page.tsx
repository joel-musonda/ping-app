import { Metadata } from "next";
import { databases, DATABASE_ID, NOTEBOOKS_COLLECTION_ID } from "@/lib/appwrite";
import NotebookClient from "@/components/NotebookClient";

type Props = {
  params: Promise<{ notebookId: string }>;
};

// Generates dynamic Open Graph tags for WhatsApp, Facebook, and Twitter crawlers
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { notebookId } = await params;
  
  let title = "Notebook on Ping";
  let description = "Read this notebook on Ping.";

  try {
    const notebook = await databases.getDocument(
      DATABASE_ID,
      NOTEBOOKS_COLLECTION_ID,
      notebookId
    );
    title = notebook.title || title;
    description = notebook.snapshot || notebook.description || description;
  } catch (err) {
    console.error("Failed to fetch notebook metadata for sharing:", err);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ping.vercel.app";
  const imageUrl = `${siteUrl}/notebooks/${notebookId}/image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
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
}

export default async function Page({ params }: Props) {
  const { notebookId } = await params;
  return <NotebookClient />;
}