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