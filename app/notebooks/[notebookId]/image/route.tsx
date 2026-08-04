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
    let description = "Read this notebook on Ping.";
    let authorName = "Joel Musonda";
    let authorHandle = "joelimusonda";
    let chapterCount = "3 min read";

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
            alignItems: "center",
            justifyContent: "center",
            background: "#09090b",
            fontFamily: "sans-serif",
          }}
        >
          {/* Medium-Style White Card Frame */}
          <div
            style={{
              width: "820px",
              height: "460px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "40px 48px",
            }}
          >
            {/* Top Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "15px",
                fontWeight: 500,
                color: "#737373",
                borderBottom: "1px solid #e5e5e5",
                paddingBottom: "16px",
              }}
            >
              <span>{chapterCount}</span>
              <span>·</span>
              <span>Ping Chapter</span>
            </div>

            {/* Middle Content Section */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                flex: 1,
                paddingTop: "24px",
                paddingBottom: "24px",
              }}
            >
              {/* Left Column: Title & Description */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  flex: 4,
                  paddingRight: "32px",
                }}
              >
                <div
                  style={{
                    fontSize: "36px",
                    fontWeight: 800,
                    color: "#0f172a",
                    lineHeight: 1.15,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {title}
                </div>
                {description && (
                  <div
                    style={{
                      fontSize: "15px",
                      color: "#475569",
                      marginTop: "12px",
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {description}
                  </div>
                )}
              </div>

              {/* Right Column: Vertical Domain Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderLeft: "1px solid #e5e5e5",
                  paddingLeft: "28px",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#64748b",
                    letterSpacing: "0.08em",
                    transform: "rotate(90deg)",
                    whiteSpace: "nowrap",
                  }}
                >
                  joinping.up.railway.app/@{authorHandle}
                </div>
              </div>
            </div>

            {/* Bottom Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #e5e5e5",
                paddingTop: "18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "18px",
                    backgroundColor: "#0f172a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  {authorName.charAt(0)}
                </div>
                <span style={{ fontSize: "15px", fontWeight: "bold", color: "#0f172a" }}>
                  {authorName}
                </span>
              </div>
              <span
                style={{
                  fontSize: "22px",
                  fontStyle: "italic",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                Ping
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (err) {
    // Ultimate fallback image response so scrapers NEVER get a 500 error
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            fontSize: "48px",
            fontWeight: "bold",
            color: "#0f172a",
          }}
        >
          Ping Notebook
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}