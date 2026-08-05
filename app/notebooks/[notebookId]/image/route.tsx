import { ImageResponse } from "next/og";
import { databases, DATABASE_ID, NOTEBOOKS_COLLECTION_ID, getPingByUserId } from "@/lib/appwrite";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ notebookId: string }> }
) {
  try {
    const { notebookId } = await params;

    let title = "Untitled Notebook";
    let description = "Read this notebook and explore chapters on Ping.";
    let authorName = "Creator";
    let authorHandle = "ping";
    let authorAvatar: string | null = null;

    try {
      const notebook = await databases.getDocument(
        DATABASE_ID,
        NOTEBOOKS_COLLECTION_ID,
        notebookId
      );
      if (notebook) {
        title = notebook.title || title;
        description = notebook.snapshot || notebook.description || description;

        // Fetch the notebook owner's profile info
        const ownerId = notebook.owner_id || notebook.user_id;
        if (ownerId) {
          try {
            const profile = await getPingByUserId(ownerId);
            if (profile) {
              authorName = profile.name || profile.username || authorName;
              authorHandle = profile.handle || profile.username || authorHandle;
              authorAvatar = profile.avatar_url || profile.avatar || null;
            }
          } catch (profileErr) {
            console.error("Error fetching author profile for OG image:", profileErr);
          }
        }
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
            backgroundColor: "#ffffff",
            backgroundImage: "radial-gradient(circle at 10% 10%, #f1f5f9 0%, transparent 40%), radial-gradient(circle at 90% 90%, #f8fafc 0%, transparent 40%)",
            padding: "60px 70px",
            fontFamily: "sans-serif",
            border: "1px solid #e2e8f0",
          }}
        >
          {/* Top Bar: Brand Pill & Domain */}
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
                backgroundColor: "#f1f5f9",
                padding: "8px 18px",
                borderRadius: "9999px",
                border: "1px solid #cbd5e1",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#0f172a",
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
                color: "#64748b",
              }}
            >
              joinping.up.railway.app/@{authorHandle}
            </span>
          </div>

          {/* Middle Section: Main Title & Description */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              maxWidth: "1050px",
            }}
          >
            <div
              style={{
                fontSize: "52px",
                fontWeight: 800,
                color: "#0f172a",
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
                  color: "#475569",
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  overflow: "hidden",
                }}
              >
                {description}
              </div>
            )}
          </div>

          {/* Bottom Footer: Author Info & Brand */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #e2e8f0",
              paddingTop: "24px",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "24px",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: 800,
                  overflow: "hidden",
                }}
              >
                {authorAvatar ? (
                  <img
                    src={authorAvatar}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  authorName.charAt(0).toUpperCase()
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                  {authorName}
                </span>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  @{authorHandle} on Ping
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: "28px",
                fontStyle: "italic",
                fontWeight: 900,
                color: "#0f172a",
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