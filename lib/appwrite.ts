import { Client, Account, Databases, ID } from "appwrite";

export const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const databases = new Databases(client);

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const PINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PINGS_COLLECTION_ID!;
export const NOTEBOOKS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_NOTEBOOKS_COLLECTION_ID!;
export const CHAPTERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CHAPTERS_COLLECTION_ID!;

export async function createPingProfile(userId: string, handle: string) {
  return await databases.createDocument(
    DATABASE_ID,
    PINGS_COLLECTION_ID,
    ID.unique(),
    {
      handle,
      bio: "",
      user_id: userId,
    }
  );
}