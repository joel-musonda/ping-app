import { NextRequest, NextResponse } from "next/server";
import { Client, Users } from "node-appwrite";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const users = new Users(client);
    await users.delete(userId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to delete account:", err);
    return NextResponse.json({ error: err.message || "Failed to delete account" }, { status: 500 });
  }
}