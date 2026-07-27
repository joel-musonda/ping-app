import { ImageResponse } from "next/og";
import { getNotebook } from "@/lib/appwrite";

export const alt = "Notebook Preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ notebookId: string }>;
}

export default async function Image({ params }: Props) {
  const { notebookId } = await params;
  
  let title = "How I'm Building Ping";
  let description = "Sharing notes and reflections on building ping";

  try {
    if (notebookId) {
      const notebook = await getNotebook(notebookId);
      if (notebook) {
        title = notebook.title || title;
        description = notebook.snapshot || notebook.description || description;
      }
    }
  } catch (err) {
    console.error("Failed to fetch notebook for OG image:", err);
  }

  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: "#f0fdf4", // Matches the soft green card tone in your feed
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "70px",
          fontFamily: "system-ui, sans-serif",
          border: "12px solid #bbf7d0",
          borderRadius: "32px",
        }}
      >
        {/* Header / Title Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "28px", color: "#166534", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px" }}>
            <span>📖</span> Ping Notebook
          </div>
          <h1
            style={{
              fontSize: "60px",
              fontWeight: "800",
              color: "#0f172a",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {title}
          </h1>
        </div>

        {/* Description & Footer Domain */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p
            style={{
              fontSize: "26px",
              color: "#475569",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {description.length > 130 ? description.slice(0, 130) + "..." : description}
          </p>
          <div style={{ fontSize: "20px", color: "#64748b", fontWeight: "500" }}>
            joinping.up.railway.app
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}