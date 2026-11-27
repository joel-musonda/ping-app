import { SeverityNumber } from "@opentelemetry/api-logs";
import { after, NextRequest, NextResponse } from "next/server";
import { Client, Users } from "node-appwrite";
import { posthogLog, posthogLogProvider } from "@/instrumentation";

function flushPostHogLogs() {
  after(async () => {
    await posthogLogProvider?.forceFlush().catch(() => {});
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      posthogLog?.emit({
        body: "Account deletion request rejected",
        severityNumber: SeverityNumber.WARN,
        attributes: { outcome: "missing_user_id" },
      });
      flushPostHogLogs();
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const users = new Users(client);
    await users.delete(userId);

    posthogLog?.emit({
      body: "Account deletion completed",
      severityNumber: SeverityNumber.INFO,
      attributes: { outcome: "success" },
    });
    flushPostHogLogs();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    posthogLog?.emit({
      body: "Account deletion failed",
      severityNumber: SeverityNumber.ERROR,
      attributes: { outcome: "failure" },
    });
    flushPostHogLogs();
    console.error("Failed to delete account:", err);
    return NextResponse.json({ error: err.message || "Failed to delete account" }, { status: 500 });
  }
}