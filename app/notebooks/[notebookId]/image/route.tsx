import { ImageResponse } from "next/og";
import { databases, DATABASE_ID, NOTEBOOKS_COLLECTION_ID } from "@/lib/appwrite";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ notebookId: string }> }
) {
  try {
    const { notebookId } = await params;

    let title = "Untitled Notebook";
    let description = "Read this notebook and explore chapters on Ping.";
    let authorName = "Joel Musonda";

    try {
      const notebook = await databases.getDocument(
        DATABASE_ID,
        NOTEBOOKS_COLLECTION_ID,
        notebookId
      );
      if (notebook) {
        title = notebook.title || title;
        description = notebook.snapshot || notebook.description || description;
      }
    } catch (dbErr) {
      console.error("Error fetching notebook for OG image:", dbErr);
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#09090b",
            backgroundImage: "radial-gradient(circle at 25% 25%, #27272a 0%, transparent 50%), radial-gradient(circle at 75% 75%, #18181b 0%, transparent 50%)",
            padding: "60px 70px",
            fontFamily: "sans-serif",
          }}
        >
          {/* Top Bar: Brand Pill & Category */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                padding: "8px 18px",
                borderRadius: "9999px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#ffffff",
                  letterSpacing: "0.05em",
                }}
              >
                PING NOTEBOOK
              </span>
            </div>

            <span
              style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#a1a1aa",
              }}
            >
              joinping.up.railway.app
            </span>
          </div>

          {/* Middle Section: Main Title & Description */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              maxWidth: "1000px",
            }}
          >
            <div
              style={{
                fontSize: "52px",
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
              }}
            >
              {title}
            </div>
            {description && (
              <div
                style={{
                  fontSize: "20px",
                  color: "#a1a1aa",
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  overflow: "hidden",
                }}
              >
                {description}
              </div>
            )}
          </div>

          {/* Bottom Footer: Author Info */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              paddingTop: "24px",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "22px",
                  backgroundColor: "#ffffff",
                  color: "#09090b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: 800,
                }}
              >
                {authorName.charAt(0)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>
                  {authorName}
                </span>
                <span style={{ fontSize: "13px", color: "#a1a1aa" }}>
                  Published on Ping
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: "28px",
                fontStyle: "italic",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "-0.03em",
              }}
            >
              Ping.
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (err) {
    return new Response("Failed to generate image", { status: 500 });
  }
}