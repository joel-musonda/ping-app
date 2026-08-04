"use client";

import { useEffect, useState } from "react";
import { Book, Users, UserPlus, UserCheck } from "lucide-react";
import { 
  databases, 
  DATABASE_ID, 
  PINGS_COLLECTION_ID, 
  account, 
  checkIsFollowing, 
  followUser, 
  unfollowUser,
  getNotebooksForUser,
  getFollowerCount
} from "@/lib/appwrite"; //[cite: 1]
import { Query } from "appwrite";

interface CommunityUser {
  id: string;          
  userId: string;      
  name: string;
  handle: string;
  bio: string;
  avatarUrl?: string;
  notebooksCount: number;
  followersCount: number;
  followDocId: string | null; 
}

export default function CommunityPage() {
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    async function loadCommunityData() {
      try {
        let activeUser = null;
        try {
          activeUser = await account.get(); //[cite: 1]
          setCurrentUser(activeUser);
        } catch (e) {
          console.warn("No active authenticated session detected.");
        }

        const pingsResponse = await databases.listDocuments(
          DATABASE_ID, //[cite: 1]
          PINGS_COLLECTION_ID, //[cite: 1]
          [Query.limit(100)]
        );

        const hydratedUsers = await Promise.all(
          pingsResponse.documents.map(async (doc) => {
            const profileUserId = doc.user_id || "";
            
            let notebooksCount = 0;
            let followersCount = 0;
            let followDocId: string | null = null;

            if (profileUserId) {
              try {
                const books = await getNotebooksForUser(profileUserId, true); //[cite: 1]
                notebooksCount = books.length;
              } catch (_) {}

              try {
                followersCount = await getFollowerCount(profileUserId); //[cite: 1]
              } catch (_) {}

              if (activeUser && activeUser.$id !== profileUserId) {
                try {
                  followDocId = await checkIsFollowing(activeUser.$id, profileUserId); //[cite: 1]
                } catch (_) {}
              }
            }

            return {
              id: doc.$id,
              userId: profileUserId,
              name: doc.name || doc.handle || "Writer",
              handle: doc.handle || "user",
              bio: doc.bio || "",
              avatarUrl: doc.avatar_url || undefined,
              notebooksCount,
              followersCount,
              followDocId,
            };
          })
        );

        const sortedUsers = hydratedUsers.sort((a, b) => b.followersCount - a.followersCount);
        setUsers(sortedUsers);
      } catch (error) {
        console.error("Community retrieval structural crash:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCommunityData();
  }, []);

  const handleFollowAction = async (targetUser: CommunityUser) => {
    if (!currentUser) return alert("Please sign in to follow creators.");
    if (currentUser.$id === targetUser.userId) return; 

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === targetUser.id) {
          const isUnfollowing = !!targetUser.followDocId;
          return {
            ...u,
            followersCount: isUnfollowing ? u.followersCount - 1 : u.followersCount + 1,
            followDocId: isUnfollowing ? null : "pending_state",
          };
        }
        return u;
      })
    );

    try {
      if (targetUser.followDocId) {
        await unfollowUser(targetUser.followDocId); //[cite: 1]
        setUsers((prev) => prev.map((u) => u.id === targetUser.id ? { ...u, followDocId: null } : u));
      } else {
        await followUser(currentUser.$id, targetUser.userId, currentUser.name, targetUser.handle); //[cite: 1]
        const newId = await checkIsFollowing(currentUser.$id, targetUser.userId); //[cite: 1]
        setUsers((prev) => prev.map((u) => u.id === targetUser.id ? { ...u, followDocId: newId } : u));
      }
    } catch (err) {
      console.error("Failed to mutate follow metrics record link:", err);
    }
  };


         // Dynamic Page Title Effect
              useEffect(() => {
                document.title = "Community | Ping";
              }, []);


  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-15 space-y-8 bg-transparent text-neutral-900">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">Community Space</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Discover and track notable authors sharing perspectives on various topics.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          // CLEAN LIGHT SKELETON LOADERS
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white border border-neutral-200 rounded-xl p-5 space-y-5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-neutral-100" />
                  <div className="space-y-2">
                    <div className="h-3 w-24 bg-neutral-100 rounded" />
                    <div className="h-2 w-16 bg-neutral-100 rounded" />
                  </div>
                </div>
                <div className="h-7 w-20 bg-neutral-100 rounded-md" />
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-neutral-100 rounded" />
                <div className="h-2 w-4/5 bg-neutral-100 rounded" />
              </div>
              <div className="pt-4 border-t border-neutral-100 flex gap-4">
                <div className="h-3 w-16 bg-neutral-100 rounded" />
                <div className="h-3 w-16 bg-neutral-100 rounded" />
              </div>
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed border-neutral-200 rounded-xl">
            <p className="text-xs text-neutral-400">No community directory profiles indexed yet.</p>
          </div>
        ) : (
          // LIGHT THEME CREATOR CARDS
          users.map((user) => (
            <div 
              key={user.id} 
              className="bg-white border border-neutral-200 hover:border-neutral-400 rounded-xl p-5 flex flex-col justify-between hover:shadow-sm transition-all duration-200"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  {/* Identity Avatar Link */}
                  <a href={`/${user.handle}`} className="flex items-center gap-3 group">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-50 border border-neutral-200 flex-shrink-0 flex items-center justify-center">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-neutral-400">
                          {user.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-neutral-900 group-hover:underline line-clamp-1">
                        {user.name}
                      </h2>
                      <p className="text-[11px] text-neutral-400">@{user.handle}</p>
                    </div>
                  </a>

                  {/* Relationship Follow Toggle */}
                  {currentUser && currentUser.$id !== user.userId && (
                    <button
                      onClick={() => handleFollowAction(user)}
                      className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                        user.followDocId
                          ? "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                          : "bg-neutral-950 border-neutral-950 text-white hover:bg-neutral-800"
                      }`}
                    >
                      {user.followDocId ? (
                        <>
                          <UserCheck className="w-3 h-3" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-neutral-600 mt-4 line-clamp-2 min-h-[2rem]">
                  {user.bio || "Hello There, Welcome to my Ping."}
                </p>
              </div>

              {/* Bottom Card Context Metadata */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-neutral-100 text-[11px] font-medium text-neutral-400">
                <div className="flex items-center gap-1">
                  <Book className="w-3.5 h-3.5" />
                  <span className="text-neutral-500">{user.notebooksCount} notebooks</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-neutral-500">{user.followersCount} followers</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}