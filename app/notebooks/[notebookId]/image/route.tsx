import { ImageResponse } from "next/og";
import { databases, DATABASE_ID, NOTEBOOKS_COLLECTION_ID, getPingByUserId } from "@/lib/appwrite";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ notebookId: string }> }
) {
  try {
    const { notebookId } = await params;

    const notebook = await databases.getDocument(
      DATABASE_ID,
      NOTEBOOKS_COLLECTION_ID,
      notebookId
    );

    let authorName = "Joel Musonda";
    let authorHandle = "joelimusonda";
    let authorAvatar = null;
    try {
      if (notebook?.owner_id) {
        const profile = await getPingByUserId(notebook.owner_id);
        if (profile) {
          authorName = profile.name || authorName;
          authorHandle = profile.handle || authorHandle;
          authorAvatar = profile.avatar_url || null;
        }
      }
    } catch (e) {
      // Fallback defaults
    }

    const title = notebook?.title || "Untitled Notebook";
    const description = notebook?.snapshot || notebook.description || "Read this notebook on Ping.";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #18181b 0%, #09090b 100%)",
            fontFamily: "sans-serif",
          }}
        >
          {/* Medium-Style White Card Container */}
          <div
            style={{
              width: "820px",
              height: "460px",
              backgroundColor: "white",
              borderRadius: "28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "36px 44px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* Top Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "15px",
                fontWeight: 500,
                color: "#525252",
                borderBottom: "1.5px solid #e5e5e5",
                paddingBottom: "16px",
              }}
            >
              <span>3 min read</span>
              <span>·</span>
              <span>Ping Chapter</span>
            </div>

            {/* Content Body */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                flex: 1,
                paddingTop: "20px",
                paddingBottom: "20px",
              }}
            >
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
                    fontWeight: 900,
                    color: "#0a0a0a",
                    lineHeight: 1.15,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {title}
                </div>
                {description && (
                  <div
                    style={{
                      fontSize: "15px",
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
                  borderLeft: "1.5px solid #e5e5e5",
                  paddingLeft: "28px",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#737373",
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
                borderTop: "1.5px solid #e5e5e5",
                paddingTop: "18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    backgroundColor: "#171717",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "bold",
                    overflow: "hidden",
                  }}
                >
                  {authorAvatar ? (
                    <img src={authorAvatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    authorName.charAt(0).toUpperCase()
                  )}
                </div>
                <span style={{ fontSize: "15px", fontWeight: "bold", color: "#171717" }}>
                  {authorName}
                </span>
              </div>
              <span
                style={{
                  fontSize: "22px",
                  fontStyle: "italic",
                  fontWeight: 900,
                  color: "#171717",
                  letterSpacing: "-0.03em",
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