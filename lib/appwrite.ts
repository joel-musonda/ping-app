import { Client, Account, Databases, ID , Query, Storage} from "appwrite";
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
export const storage = new Storage(client);
export const IMAGES_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_IMAGES_BUCKET_ID!;
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
  snapshot: string = "",
  coverImageUrl: string = "",
  collaboratorIds: string[] = []
) {
  // Only pass permissions belonging to the active user session or public roles
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
      cover_image_url: coverImageUrl,
      collaborator_ids: collaboratorIds,
    },
    permissions
  );
}
   
export async function createChapter(
  notebookId: string,
  ownerId: string, // The active user creating this specific chapter
  isPublic: boolean,
  title: string,
  contentJson: string,
  orderIndex: number
) {
  // Only grant permission rules that belong to the active creator session
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
  // Query 1: Notebooks owned by the user
  const ownerQueries = [Query.equal("owner_id", userId)];
  if (publicOnly) ownerQueries.push(Query.equal("is_public", true));

  // Query 2: Notebooks where the user is a collaborator
  const collabQueries = [Query.contains("collaborator_ids", userId)];
  if (publicOnly) collabQueries.push(Query.equal("is_public", true));

  // Execute queries simultaneously over the network
  const [ownedRes, collabRes] = await Promise.all([
    databases.listDocuments(DATABASE_ID, NOTEBOOKS_COLLECTION_ID, ownerQueries),
    databases.listDocuments(DATABASE_ID, NOTEBOOKS_COLLECTION_ID, collabQueries),
  ]);

  // Combine and de-duplicate overlapping documents using their unique Appwrite ID ($id)
  const combinedNotebooks = [...ownedRes.documents, ...collabRes.documents];
  const uniqueMap = new Map();
  combinedNotebooks.forEach((doc) => uniqueMap.set(doc.$id, doc));

  return Array.from(uniqueMap.values());
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
  content: string,
  name: string = "",
  avatarUrl: string = ""
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
      name,
      avatar_url: avatarUrl,
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
export async function uploadNotebookCoverImage(file: File): Promise<string> {
  const response = await storage.createFile(IMAGES_BUCKET_ID, ID.unique(), file);
  return response.$id;
}
export function getNotebookCoverImageUrl(fileId: string): string {
  const result = storage.getFileView(IMAGES_BUCKET_ID, fileId);
  return typeof result === "string" ? result : (result as URL).href;
}

export async function notifyLike(
  targetUserId: string,
  senderId: string,
  senderName: string,
  senderHandle: string,
  chapterId: string
) {
  if (targetUserId === senderId) return;
  await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, ID.unique(), {
    user_id: targetUserId,
    sender_name: senderName,
    sender_handle: senderHandle,
    type: "like",
    chapter_id: chapterId,
  });
}

export async function notifyComment(
  targetUserId: string,
  senderId: string,
  senderName: string,
  senderHandle: string,
  chapterId: string
) {
  if (targetUserId === senderId) return;
  await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, ID.unique(), {
    user_id: targetUserId,
    sender_name: senderName,
    sender_handle: senderHandle,
    type: "comment",
    chapter_id: chapterId,
  });
}
export async function updateProfile(pingId: string, updates: Record<string, any>) {
  return await databases.updateDocument(DATABASE_ID, PINGS_COLLECTION_ID, pingId, updates);
}

export async function deleteNotebookCascade(notebookId: string) {
  // Delete all chapters in this notebook first, then the notebook itself
  const chapters = await getChaptersForNotebook(notebookId);
  await Promise.all(
    chapters.map((ch) => databases.deleteDocument(DATABASE_ID, CHAPTERS_COLLECTION_ID, ch.$id))
  );
  await databases.deleteDocument(DATABASE_ID, NOTEBOOKS_COLLECTION_ID, notebookId);
}
export const COLLABORATION_INVITES_COLLECTION_ID = "collaboration_invites";


export async function inviteCollaborator(
  notebookId: string,
  notebookTitle: string,
  inviterId: string,
  inviterName: string,
  inviterHandle: string,
  inviteeId: string
) {
  if (inviterId === inviteeId) {
    throw new Error("You can't invite yourself as a collaborator.");
  }

  // FIX: Only pass permissions that belong to YOU (the inviter), 
  // or leave it empty [] so it perfectly inherits collection rules.
  const invite = await databases.createDocument(
    DATABASE_ID,
    COLLABORATION_INVITES_COLLECTION_ID,
    ID.unique(),
    {
      notebook_id: notebookId,
      notebook_title: notebookTitle,
      inviter_id: inviterId,
      invitee_id: inviteeId,
      status: "pending",
    },
    [
      Permission.read(Role.user(inviterId)),
      Permission.update(Role.user(inviterId)),
      Permission.delete(Role.user(inviterId)),
    ]
  );

  // FIX: Only pass permissions belonging to your current session,
  // or leave it empty [] since Collection settings cover the rest.
  await databases.createDocument(
    DATABASE_ID, 
    NOTIFICATIONS_COLLECTION_ID, 
    ID.unique(), 
    {
      user_id: inviteeId,
      sender_name: inviterName,
      sender_handle: inviterHandle,
      type: "collab_invite",
      invite_id: invite.$id, 
    },
    [
      Permission.read(Role.user(inviterId)),
      Permission.delete(Role.user(inviterId)),
    ]
  );

  return invite;
}

export async function getPendingInvitesForUser(userId: string) {
  const res = await databases.listDocuments(DATABASE_ID, COLLABORATION_INVITES_COLLECTION_ID, [
    Query.equal("invitee_id", userId),
    Query.equal("status", "pending"),
  ]);
  return res.documents;
}

export async function getInvite(inviteId: string) {
  return await databases.getDocument(DATABASE_ID, COLLABORATION_INVITES_COLLECTION_ID, inviteId);
}
export async function syncNotebookPermissions(notebookId: string) {
  const notebook = await getNotebook(notebookId);
  const collaboratorIds: string[] = notebook.collaborator_ids || [];

  const permissions = [
    Permission.read(Role.user(notebook.owner_id)),
    Permission.update(Role.user(notebook.owner_id)),
    Permission.delete(Role.user(notebook.owner_id)),
    ...collaboratorIds.flatMap((id) => [
      Permission.read(Role.user(id)),
      Permission.update(Role.user(id)),
      // Deliberately no delete permission for collaborators — only the owner can delete
    ]),
  ];

  if (notebook.is_public) {
    permissions.push(Permission.read(Role.any()));
  }

  // Passing {} as the data param leaves the document's fields untouched —
  // this call only updates its permissions.
  await databases.updateDocument(DATABASE_ID, NOTEBOOKS_COLLECTION_ID, notebookId, {}, permissions);

  const chapters = await getChaptersForNotebook(notebookId);
  await Promise.all(
    chapters.map((ch) =>
      databases.updateDocument(DATABASE_ID, CHAPTERS_COLLECTION_ID, ch.$id, {}, permissions)
    )
  );
}


export async function respondToInvite(inviteId: string, accept: boolean, currentUserId: string) {
  // 1. Update the invitation status document
  // Pass null or a basic permission array matching ONLY the current user 
  // so the Client SDK doesn't throw a validation error.
  const invite = await databases.updateDocument(
    DATABASE_ID,
    COLLABORATION_INVITES_COLLECTION_ID,
    inviteId,
    {
      status: accept ? "accepted" : "declined",
    },
    [
      Permission.read(Role.user(currentUserId)),
      Permission.update(Role.user(currentUserId)),
    ]
  );

  if (accept && invite) {
    // 2. Fetch the target notebook to get its current collaborator list
    const notebook = await databases.getDocument(
      DATABASE_ID,
      NOTEBOOKS_COLLECTION_ID,
      invite.notebook_id
    );

    const currentCollaborators = notebook.collaborator_ids || [];
    
    if (!currentCollaborators.includes(currentUserId)) {
      // 3. Add the user to the notebook's collaborator list column
      await databases.updateDocument(
        DATABASE_ID,
        NOTEBOOKS_COLLECTION_ID,
        invite.notebook_id,
        {
          collaborator_ids: [...currentCollaborators, currentUserId],
        },
        // FIX: Remove custom collaborator permissions arrays here!
        // Leave this array empty [] or only reference currentUserId. 
        // Your collection settings cover the rest since Document Security is false.
        [] 
      );
    }
  }

  return invite;
}

export async function searchPingsByHandle(query: string) {
  const res = await databases.listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [
    Query.search("handle", query),
    Query.limit(5),
  ]);
  return res.documents;
}