"use client";

import { useEffect, useState } from "react";
import { Book, Users, UserPlus, UserCheck, Search } from "lucide-react";
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
} from "@/lib/appwrite";
import { Query } from "appwrite";
import posthog from "posthog-js";

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
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadCommunityData() {
      try {
        let activeUser = null;
        try {
          activeUser = await account.get();
          setCurrentUser(activeUser);
        } catch (e) {
          console.warn("No active authenticated session detected.");
        }

        const pingsResponse = await databases.listDocuments(
          DATABASE_ID,
          PINGS_COLLECTION_ID,
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
                const books = await getNotebooksForUser(profileUserId, true);
                notebooksCount = books.length;
              } catch (_) {}

              try {
                followersCount = await getFollowerCount(profileUserId);
              } catch (_) {}

              if (activeUser && activeUser.$id !== profileUserId) {
                try {
                  followDocId = await checkIsFollowing(activeUser.$id, profileUserId);
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
        await unfollowUser(targetUser.followDocId);
        setUsers((prev) => prev.map((u) => u.id === targetUser.id ? { ...u, followDocId: null } : u));
      } else {
        await followUser(currentUser.$id, targetUser.userId, currentUser.name, targetUser.handle);
        const newId = await checkIsFollowing(currentUser.$id, targetUser.userId);
        setUsers((prev) => prev.map((u) => u.id === targetUser.id ? { ...u, followDocId: newId } : u));
        posthog.capture("user_followed");
      }
    } catch (err) {
      console.error("Failed to mutate follow metrics record link:", err);
    }
  };

  // Dynamic Page Title Effect
  useEffect(() => {
    document.title = "Community | Ping";
  }, []);

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.handle.toLowerCase().includes(query) ||
      user.bio.toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-15 space-y-8 bg-transparent text-neutral-900 dark:text-neutral-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Community Space</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Discover and track notable authors sharing perspectives on various topics.
          </p>
        </div>

        {/* Search Filter Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          <input
            type="text"
            placeholder="Search authors or handles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          // SKELETON LOADERS WITH DARK MODE
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                  <div className="space-y-2">
                    <div className="h-3 w-24 bg-neutral-100 dark:bg-neutral-800 rounded" />
                    <div className="h-2 w-16 bg-neutral-100 dark:bg-neutral-800 rounded" />
                  </div>
                </div>
                <div className="h-7 w-20 bg-neutral-100 dark:bg-neutral-800 rounded-md" />
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded" />
                <div className="h-2 w-4/5 bg-neutral-100 dark:bg-neutral-800 rounded" />
              </div>
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex gap-4">
                <div className="h-3 w-16 bg-neutral-100 dark:bg-neutral-800 rounded" />
                <div className="h-3 w-16 bg-neutral-100 dark:bg-neutral-800 rounded" />
              </div>
            </div>
          ))
        ) : filteredUsers.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {users.length === 0 ? "No community directory profiles indexed yet." : "No authors matched your search criteria."}
            </p>
          </div>
        ) : (
          // CREATOR CARDS WITH DARK THEME
          filteredUsers.map((user) => (
            <div 
              key={user.id} 
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 rounded-xl p-5 flex flex-col justify-between hover:shadow-sm transition-all duration-200"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  {/* Identity Avatar Link */}
                  <a href={`/${user.handle}`} className="flex items-center gap-3 group">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex-shrink-0 flex items-center justify-center">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500">
                          {user.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:underline line-clamp-1">
                        {user.name}
                      </h2>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">@{user.handle}</p>
                    </div>
                  </a>

                  {/* Relationship Follow Toggle */}
                  {currentUser && currentUser.$id !== user.userId && (
                    <button
                      onClick={() => handleFollowAction(user)}
                      className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                        user.followDocId
                          ? "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          : "bg-neutral-950 dark:bg-white border-neutral-950 dark:border-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200"
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

                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-4 line-clamp-2 min-h-[2rem]">
                  {user.bio || "Hello There, Welcome to my Ping."}
                </p>
              </div>

              {/* Bottom Card Context Metadata */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                <div className="flex items-center gap-1">
                  <Book className="w-3.5 h-3.5" />
                  <span className="text-neutral-500 dark:text-neutral-400">{user.notebooksCount} notebooks</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-neutral-500 dark:text-neutral-400">{user.followersCount} followers</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}