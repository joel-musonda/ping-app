import { ImageResponse } from "next/og";
import { databases, DATABASE_ID, NOTEBOOKS_COLLECTION_ID } from "@/lib/appwrite";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const notebook = await databases.getDocument(
      DATABASE_ID,
      NOTEBOOKS_COLLECTION_ID,
      id
    );

    const title = notebook?.title || "Untitled Notebook";
    const description = notebook?.snapshot || notebook.description || "Read this notebook on Ping.";
    const chapterCount = notebook?.chapter_count || 1;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f5f5f5",
            padding: "40px",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              width: "600px",
              height: "400px",
              backgroundColor: "white",
              borderRadius: "32px",
              border: "1px solid #e5e5e5",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "36px",
              boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
            }}
          >
            {/* Top Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "14px",
                fontWeight: 500,
                color: "#737373",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                borderBottom: "1px solid #e5e5e5",
                paddingBottom: "16px",
              }}
            >
              <span>{chapterCount} chapters</span>
              <span>·</span>
              <span>3 min read</span>
            </div>

            {/* Middle Content Split */}
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
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  flex: 3,
                  paddingRight: "24px",
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 900,
                    color: "#171717",
                    lineHeight: 1.15,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {title}
                </div>
                {description && (
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#525252",
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

              {/* Right Vertical Domain Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderLeft: "1px solid #e5e5e5",
                  paddingLeft: "20px",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#a3a3a3",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    transform: "rotate(90deg)",
                    whiteSpace: "nowrap",
                  }}
                >
                  ping.vercel.app
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
                paddingTop: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "#171717",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  P
                </div>
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#171717" }}>
                  Ping Creator
                </span>
              </div>
              <span
                style={{
                  fontSize: "20px",
                  fontStyle: "italic",
                  fontWeight: 900,
                  color: "#171717",
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
  } catch (e) {
    return new Response("Failed to generate image", { status: 500 });
  }
}