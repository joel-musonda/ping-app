import { Client, Account, Databases, ID , Query,} from "appwrite";
import { Permission, Role } from "appwrite";




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
  isPublic: boolean,
  snapshot: string = ""
) {
  const permissions = [
    Permission.read(Role.user(ownerId)),
    Permission.update(Role.user(ownerId)),
    Permission.delete(Role.user(ownerId)),
  ];

  if (isPublic) {
    permissions.push(Permission.read(Role.any()));
  }

  return await databases.createDocument(
    DATABASE_ID,
    NOTEBOOKS_COLLECTION_ID,
    ID.unique(),
    {
      title,
      description,
      is_public: isPublic,
      owner_id: ownerId,
      snapshot,
    },
    permissions
  );
}

export async function createChapter(
  notebookId: string,
  ownerId: string,
  isPublic: boolean,
  title: string,
  contentJson: string,
  orderIndex: number
) {
  const permissions = [
    Permission.read(Role.user(ownerId)),
    Permission.update(Role.user(ownerId)),
    Permission.delete(Role.user(ownerId)),
  ];

  if (isPublic) {
    permissions.push(Permission.read(Role.any()));
  }

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
    },
    permissions
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
export async function getChapter(chapterId: string) {
  return await databases.getDocument(DATABASE_ID, CHAPTERS_COLLECTION_ID, chapterId);
}

export async function updateChapter(chapterId: string, updates: Record<string, any>) {
  return await databases.updateDocument(DATABASE_ID, CHAPTERS_COLLECTION_ID, chapterId, updates);
}
export async function getNotebooksForUser(userId: string, publicOnly: boolean) {
  const queries = [Query.equal("owner_id", userId)];
  if (publicOnly) {
    queries.push(Query.equal("is_public", true));
  }
  const result = await databases.listDocuments(DATABASE_ID, NOTEBOOKS_COLLECTION_ID, queries);
  return result.documents;
}
export async function getPublicNotebooks() {
  const result = await databases.listDocuments(DATABASE_ID, NOTEBOOKS_COLLECTION_ID, [
    Query.equal("is_public", true),
    Query.orderDesc("$createdAt"),
  ]);
  return result.documents;
}

export async function getPingByUserId(userId: string) {
  const result = await databases.listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [
    Query.equal("user_id", userId),
  ]);
  return result.documents[0] ?? null;
}export const FOLLOWS_COLLECTION_ID = "follows";
export const NOTIFICATIONS_COLLECTION_ID = "notifications";

// Check if a relationship exists
export async function checkIsFollowing(followerId: string, followingId: string) {
  const res = await databases.listDocuments(DATABASE_ID, FOLLOWS_COLLECTION_ID, [
    Query.equal("follower_id", followerId),
    Query.equal("following_id", followingId)
  ]);
  return res.documents.length > 0 ? res.documents[0].$id : null;
}

// Follow a user and send a notification record
export async function followUser(currentUserId: string, targetUserId: string, senderName: string, senderHandle: string) {
  // 1. Create Follow Record
  await databases.createDocument(DATABASE_ID, FOLLOWS_COLLECTION_ID, ID.unique(), {
    follower_id: currentUserId,
    following_id: targetUserId,
  });

  // 2. Dispatch Notification to Target
  await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, ID.unique(), {
    user_id: targetUserId,
    sender_name: senderName,
    sender_handle: senderHandle,
    type: "follow",
  });
}

// Unfollow a user
export async function unfollowUser(followDocId: string) {
  await databases.deleteDocument(DATABASE_ID, FOLLOWS_COLLECTION_ID, followDocId);
}

// Fetch active notifications
export async function getNotifications(userId: string) {
  const res = await databases.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, [
    Query.equal("user_id", userId),
    Query.orderDesc("$createdAt")
  ]);
  return res.documents;
}

// Delete a notification card
export async function deleteNotification(docId: string) {
  await databases.deleteDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, docId);
}
export async function getFollowerCount(userId: string) {
  const res = await databases.listDocuments(DATABASE_ID, FOLLOWS_COLLECTION_ID, [
    Query.equal("following_id", userId),
    Query.limit(1),
  ]);
  return res.total;
}

export async function getFollowingCount(userId: string) {
  const res = await databases.listDocuments(DATABASE_ID, FOLLOWS_COLLECTION_ID, [
    Query.equal("follower_id", userId),
    Query.limit(1),
  ]);
  return res.total;
}

export async function searchAll(query: string) {
  const [notebooksRes, pingsRes] = await Promise.all([
    databases.listDocuments(DATABASE_ID, NOTEBOOKS_COLLECTION_ID, [
      Query.equal("is_public", true),
      Query.search("title", query),
      Query.limit(5),
    ]),
    databases.listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [
      Query.search("handle", query),
      Query.limit(5),
    ]),
  ]);
  return { notebooks: notebooksRes.documents, pings: pingsRes.documents };
}
export async function getUserActivityDates(userId: string): Promise<Set<string>> {
  const notebooks = await getNotebooksForUser(userId, false);
  console.log("DEBUG notebooks:", notebooks.length, notebooks);

  const allChapters = await Promise.all(
    notebooks.map((nb) => getChaptersForNotebook(nb.$id))
  );
  console.log("DEBUG chapters:", allChapters.flat().length, allChapters.flat());

  const dates = new Set<string>();
  allChapters.flat().forEach((chapter) => {
    const date = new Date(chapter.$updatedAt).toISOString().split("T")[0];
    dates.add(date);
  });

  console.log("DEBUG activityDates:", [...dates]);
  return dates;
}
export const LIKES_COLLECTION_ID = "likes";

export async function checkIsLiked(userId: string, chapterId: string) {
  const res = await databases.listDocuments(DATABASE_ID, LIKES_COLLECTION_ID, [
    Query.equal("user_id", userId),
    Query.equal("chapter_id", chapterId),
  ]);
  return res.documents.length > 0 ? res.documents[0].$id : null;
}

export async function getLikeCount(chapterId: string) {
  const res = await databases.listDocuments(DATABASE_ID, LIKES_COLLECTION_ID, [
    Query.equal("chapter_id", chapterId),
    Query.limit(1),
  ]);
  return res.total;
}

export async function likeChapter(userId: string, chapterId: string) {
  return await databases.createDocument(DATABASE_ID, LIKES_COLLECTION_ID, ID.unique(), {
    user_id: userId,
    chapter_id: chapterId,
  });
}

export async function unlikeChapter(likeDocId: string) {
  return await databases.deleteDocument(DATABASE_ID, LIKES_COLLECTION_ID, likeDocId);
}
export const COMMENTS_COLLECTION_ID = "comments";

export async function createComment(
  chapterId: string,
  userId: string,
  handle: string,
  content: string
) {
  return await databases.createDocument(
    DATABASE_ID,
    COMMENTS_COLLECTION_ID,
    ID.unique(),
    {
      chapter_id: chapterId,
      user_id: userId,
      handle,
      content,
    },
    [
      Permission.read(Role.any()),
      Permission.delete(Role.user(userId)),
    ]
  );
}

export async function getCommentsForChapter(chapterId: string) {
  const res = await databases.listDocuments(DATABASE_ID, COMMENTS_COLLECTION_ID, [
    Query.equal("chapter_id", chapterId),
    Query.orderDesc("$createdAt"),
  ]);
  return res.documents;
}

export async function deleteComment(commentId: string) {
  return await databases.deleteDocument(DATABASE_ID, COMMENTS_COLLECTION_ID, commentId);
}
export async function getNotebookEngagement(notebookId: string) {
  const chapters = await getChaptersForNotebook(notebookId);
  const chapterIds = chapters.map((c) => c.$id);

  const [likeCounts, commentCounts] = await Promise.all([
    Promise.all(chapterIds.map((id) => getLikeCount(id))),
    Promise.all(
      chapterIds.map((id) =>
        databases
          .listDocuments(DATABASE_ID, COMMENTS_COLLECTION_ID, [
            Query.equal("chapter_id", id),
            Query.limit(1),
          ])
          .then((res) => res.total)
      )
    ),
  ]);

  return {
    likes: likeCounts.reduce((a, b) => a + b, 0),
    comments: commentCounts.reduce((a, b) => a + b, 0),
    chapterCount: chapters.length,
  };
}