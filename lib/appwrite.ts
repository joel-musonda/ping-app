import { Client, Account, Databases, ID , Query} from "appwrite";

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
export async function createNotebook(
  ownerId: string,
  title: string,
  description: string,
  isPublic: boolean
) {
  return await databases.createDocument(
    DATABASE_ID,
    NOTEBOOKS_COLLECTION_ID,
    ID.unique(),
    {
      title,
      description,
      is_public: isPublic,
      owner_id: ownerId,
    }
  );
}
export async function createChapter(
  notebookId: string,
  title: string,
  contentJson: string,
  orderIndex: number
) {
  return await databases.createDocument(
    DATABASE_ID,
    CHAPTERS_COLLECTION_ID,
    ID.unique(),
    {
      title,
      content_json: contentJson,
      order_index: orderIndex,
      notebook_id: notebookId,
      is_published: false,
    }
  );
}

export async function getNotebook(notebookId: string) {
  return await databases.getDocument(DATABASE_ID, NOTEBOOKS_COLLECTION_ID, notebookId);
}

export async function getChaptersForNotebook(notebookId: string) {
  const result = await databases.listDocuments(DATABASE_ID, CHAPTERS_COLLECTION_ID, [
    Query.equal("notebook_id", notebookId),
    Query.orderAsc("order_index"),
  ]);
  return result.documents;
}