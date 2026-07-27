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
  
  let title = "Ping Notebook";
  let description = "Sharing notes and reflections";

  try {
    if (notebookId) {
      const notebook = await getNotebook(notebookId);
      if (notebook) {
        title = notebook.title || title;
        description = notebook.snapshot || notebook.description || description;
      }
    }
  } catch (err) {
    console.error("OG Image fetch error:", err);
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: "#ffffff",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "sans-serif",
          border: "16px solid #f1f5f9",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "#0084FF",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "30px",
              fontWeight: "bold",
            }}
          >
            P
          </div>
          <span style={{ fontSize: "28px", fontWeight: "600", color: "#64748b" }}>
            Ping Notebook
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h1
            style={{
              fontSize: "64px",
              fontWeight: "800",
              color: "#0f172a",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {title}
          </h1>
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
        </div>

        <div style={{ fontSize: "20px", color: "#94a3b8", fontWeight: "500" }}>
          joinping.up.railway.app
        </div>
      </div>
    ),
    { ...size }
  );
}