import { NextRequest, NextResponse } from "next/server";
import { Account, Client, Users } from "node-appwrite";

export async function POST(req: NextRequest) {
  try {
    const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId: string;
    try {
      const sessionClient = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
        .setJWT(jwt);
      const user = await new Account(sessionClient).get();
      userId = user.$id;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    await new Users(adminClient).delete(userId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to delete account:", err);
    return NextResponse.json({ error: err.message || "Failed to delete account" }, { status: 500 });
  }
}
