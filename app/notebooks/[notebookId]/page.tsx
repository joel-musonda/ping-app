import { getNotebook, getChaptersForNotebook } from "@/lib/appwrite";
import NotebookClient from "@/components/NotebookClient";

type Props = {
  params: Promise<{ notebookId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { notebookId } = await params;
  try {
    const notebook = await getNotebook(notebookId);
    const chapters = await getChaptersForNotebook(notebookId);
    const firstChapter = chapters[0];

    const title = firstChapter ? `${firstChapter.title} — ${notebook.title}` : notebook.title;
    const description = notebook.snapshot || notebook.description || "Read this notebook on Nzelu AI.";
    const image = firstChapter?.preview_image_url || notebook.preview_image_url || "";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: image ? [{ url: image }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: image ? [image] : [],
      },
    };
  } catch {
    return {
      title: "Notebook — Nzelu AI",
      description: "Read this notebook on Nzelu AI.",
    };
  }
}

export default async function Page({ params }: Props) {
  const { notebookId } = await params;
  return <NotebookClient notebookId={notebookId} />;
}