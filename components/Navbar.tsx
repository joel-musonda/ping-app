"use client";

import { useEffect, useState, useRef } from "react";
import { getCurrentUser, logOut } from "@/lib/auth";
import {
  getPingByUserId,
  getNotifications,
  deleteNotification,
  searchAll,
  respondToInvite,
} from "@/lib/appwrite";
import { useRouter, usePathname } from "next/navigation";
import {
  Search, Bell, Plus, User, Book, Database, Heart, Settings,
  Paintbrush, LogOut, ArrowLeftRight, Home, Info, AlertCircle, Trash2, UserPlus, X, Flame, Check, BarChart3
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const [profileData, setProfileData] = useState<{
    handle: string;
    name: string;
    avatarUrl: string;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState<any[]>([]);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ notebooks: any[]; pings: any[] }>({
    notebooks: [],
    pings: [],
  });
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    getCurrentUser()
      .then(async (user) => {
        setCurrentUserId(user?.$id ?? null);

        if (!user) {
          setProfileData(null);
          return;
        }
        const ping = await getPingByUserId(user.$id);
        if (ping) {
          setProfileData({
            handle: ping.handle,
            name: ping.name || `@${ping.handle}`,
            avatarUrl: ping.avatar_url || "",
          });
        }

        try {
          const notifs = await getNotifications(user.$id);
          setNotifications(notifs);
        } catch (err) {
          console.error("Failed to load notifications:", err);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logOut();
    setProfileData(null);
    router.push("/");
    router.refresh();
  };

  const handleDismissNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.$id !== id));
    } catch (err) {
      console.error("Failed to dismiss notification:", err);
    }
  };

  const handleInviteResponse = async (
    inviteId: string,
    accept: boolean,
    notifId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!currentUserId) return;
    try {
      await respondToInvite(inviteId, accept, currentUserId);
      await deleteNotification(notifId);
      setNotifications((prev) => prev.filter((n) => n.$id !== notifId));
    } catch (err) {
      console.error("Failed to respond to invite:", err);
    }
  };

  const handleNewNotebookClick = () => {
    if (profileData) {
      router.push("/notebooks/new");
    } else {
      router.push("/login");
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSearchOpen(value.length > 0);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length === 0) {
      setSearchResults({ notebooks: [], pings: [] });
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchAll(value.trim());
        setSearchResults(results);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults({ notebooks: [], pings: [] });
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSearchResultClick = () => {
    setSearchOpen(false);
    setMobileSearchOpen(false);
    setSearchQuery("");
    setSearchResults({ notebooks: [], pings: [] });
  };

  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/onboarding" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/auth/callback"
  ) {
    return null;
  }

  const hasResults = searchResults.notebooks.length > 0 || searchResults.pings.length > 0;

  const SearchResultsPanel = () => (
    <div className="p-2 flex flex-col gap-0.5 max-h-72 overflow-y-auto [scrollbar-width:none]">
      {searching ? (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#8b949e] italic">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Searching...</span>
        </div>
      ) : !hasResults ? (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#8b949e] italic">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>No results found</span>
        </div>
      ) : (
        <>
          {searchResults.pings.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1 text-[10px] font-bold text-[#8b949e] uppercase">People</p>
              {searchResults.pings.map((p) => (
                <a
                  key={p.$id}
                  href={`/${p.handle}`}
                  onClick={handleSearchResultClick}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-[#21262d] text-xs transition"
                >
                  <User className="w-3.5 h-3.5 text-[#8b949e]" />
                  <span className="text-white">@{p.handle}</span>
                </a>
              ))}
            </div>
          )}
          {searchResults.notebooks.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-bold text-[#8b949e] uppercase">Notebooks</p>
              {searchResults.notebooks.map((nb) => (
                <a
                  key={nb.$id}
                  href={`/notebooks/${nb.$id}`}
                  onClick={handleSearchResultClick}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-[#21262d] text-xs transition"
                >
                  <Book className="w-3.5 h-3.5 text-[#8b949e]" />
                  <span className="truncate">{nb.title}</span>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const NotificationRow = ({ notif }: { notif: any }) => (
    <div className="p-3 flex items-start justify-between gap-2.5 hover:bg-[#161b22] transition group">
      <div className="flex gap-2 min-w-0">
        <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-950/50 flex items-center justify-center border border-blue-800 shrink-0">
          <UserPlus className="w-3 h-3 text-blue-400" />
        </div>
        <div className="flex flex-col min-w-0 text-xs">
          <p className="text-[#c9d1d9] font-medium break-words">
            <span className="text-white font-bold">@{notif.sender_handle}</span>{" "}
            {notif.type === "like"
              ? "liked your chapter."
              : notif.type === "comment"
              ? "commented on your chapter."
              : notif.type === "collab_invite"
              ? "invited you to collaborate on a notebook."
              : "started following you."}
          </p>

          {notif.type === "collab_invite" ? (
            <div className="flex gap-2 mt-1.5">
              <button
                onClick={(e) => handleInviteResponse(notif.invite_id, true, notif.$id, e)}
                className="flex items-center gap-1 text-[10px] font-semibold bg-green-600/20 text-green-400 border border-green-800 rounded px-2 py-1 hover:bg-green-600/30 transition"
              >
                <Check className="w-3 h-3" /> Accept
              </button>
              <button
                onClick={(e) => handleInviteResponse(notif.invite_id, false, notif.$id, e)}
                className="flex items-center gap-1 text-[10px] font-semibold bg-red-600/20 text-red-400 border border-red-800 rounded px-2 py-1 hover:bg-red-600/30 transition"
              >
                <X className="w-3 h-3" /> Decline
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-[#8b949e] mt-0.5">Just now</span>
          )}
        </div>
      </div>

      <button
        onClick={(e) => handleDismissNotification(notif.$id, e)}
        className="p-1 rounded-md text-[#8b949e] hover:text-[#f85149] hover:bg-[#f85149]/10 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0"
        title="Dismiss alert"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <>
      {/* TOP BAR */}
      <nav className="flex items-center justify-between px-4 py-1 border-b border-neutral-200 bg-white select-none h-14 relative z-50">

        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2 hover:opacity-90 transition">
            <div className="w-6 h-6 rounded-md bg-neutral-900 flex items-center justify-center text-white font-black text-xs overflow-hidden">
              <Image src="/logo.png" alt="Ping Logo" width={80} height={80} className="object-contain" priority />
            </div>
            <span className="font-bold text-base tracking-tight text-neutral-900">Ping</span>
          </a>
        </div>

        <div className="flex items-center gap-3">

          <div className="relative hidden md:block" ref={searchRef}>
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search notebooks or @handles..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                if (searchQuery.length > 0) setSearchOpen(true);
              }}
              className="w-56 h-8 pl-8 pr-4 rounded-md border border-neutral-200 bg-neutral-50/50 text-xs font-normal text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-300 focus:bg-white transition-all"
            />

            {searchOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#0d1117] border border-[#30363d] shadow-2xl text-[#c9d1d9] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3 border-b border-[#30363d]">
                  <span className="text-[10px] font-bold tracking-wider text-[#8b949e] uppercase">
                    Results for &quot;{searchQuery}&quot;
                  </span>
                </div>
                <SearchResultsPanel />
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileSearchOpen((v) => !v)}
            className="md:hidden w-8 h-8 rounded-md flex items-center justify-center border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition"
          >
            {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-neutral-100 animate-pulse" />
          ) : profileData ? (
            <>
              <button
                onClick={handleNewNotebookClick}
                className="hidden md:flex h-8 pl-2.5 pr-3 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Notebook</span>
              </button>

              <a
                href="/"
                title="View Feed Dashboard"
                className="hidden md:flex w-8 h-8 rounded-md items-center justify-center border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-600 transition"
              >
                <Home className="w-4 h-4" />
              </a>

              <div className="relative hidden md:block" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="w-8 h-8 rounded-md flex items-center justify-center border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-600 transition relative"
                >
                  <Bell className="w-4 h-4" />
                  {(notifications?.length ?? 0) > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-neutral-900 ring-2 ring-white" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#0d1117] border border-[#30363d] shadow-2xl text-[#c9d1d9] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-3 border-b border-[#30363d] flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Notifications</span>
                      <span className="text-[10px] text-[#8b949e] bg-[#21262d] px-1.5 py-0.5 rounded-full font-medium">
                        {notifications.length} New
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto [scrollbar-width:none] flex flex-col divide-y divide-[#30363d]">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-5 h-5 text-[#8b949e]" />
                          <p className="text-xs text-[#8b949e]">Notifications fully up to date.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => <NotificationRow key={notif.$id} notif={notif} />)
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={profileRef}>
                <div
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="w-8 h-8 rounded-full border border-neutral-200 overflow-hidden bg-neutral-50 flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:opacity-90 active:scale-95 transition"
                >
                  {profileData.avatarUrl ? (
                    <img src={profileData.avatarUrl} alt="Workspace Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center uppercase">
                      {profileData.handle.charAt(0)}
                    </div>
                  )}
                </div>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0d1117] border border-[#30363d] shadow-2xl text-[#c9d1d9] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">

                    <div className="p-4 border-b border-[#30363d] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-700 border border-[#30363d] flex items-center justify-center shrink-0">
                          {profileData.avatarUrl ? (
                            <img src={profileData.avatarUrl} alt="Menu Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-xs text-white uppercase">{profileData.handle.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate leading-tight">@{profileData.handle}</span>
                          <span className="text-[11px] text-[#8b949e] truncate mt-0.5">{profileData.name}</span>
                        </div>
                      </div>
                      <button className="p-1 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-white transition">
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-2 border-b border-[#30363d] flex flex-col gap-0.5">
                      <a href={`/${profileData.handle}`} onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-md text-[#c9d1d9] hover:bg-[#21262d] hover:text-white transition">
                        <User className="w-3.5 h-3.5 text-[#8b949e]" />
                        <span>Profile</span>
                      </a>
                      <a href={`/${profileData.handle}`} onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-md text-[#c9d1d9] hover:bg-[#21262d] hover:text-white transition">
                        <Book className="w-3.5 h-3.5 text-[#8b949e]" />
                        <span>Notebooks</span>
                      </a>
                      <Link href="/community" onClick={() => setProfileOpen(false)}>
                        <button className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-md text-left text-[#c9d1d9] hover:bg-[#21262d] hover:text-white transition">
                          <Heart className="w-3.5 h-3.5 text-[#8b949e]" />
                          <span>Community</span>
                        </button>
                      </Link>
                      
                      {/* ANALYTICS DASHBOARD LINK */}
                      <Link href="/analytics" onClick={() => setProfileOpen(false)}>
                        <button className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-md text-left text-[#c9d1d9] hover:bg-[#21262d] hover:text-white transition">
                          <BarChart3 className="w-3.5 h-3.5 text-[#8b949e]" />
                          <span>Analytics</span>
                        </button>
                      </Link>
                    </div>

                    <div className="p-2 border-b border-[#30363d] flex flex-col gap-0.5">
                      <Link href="/settings" onClick={() => setProfileOpen(false)}>
                        <button className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-md text-left text-[#c9d1d9] hover:bg-[#21262d] hover:text-white transition">
                          <Settings className="w-3.5 h-3.5 text-[#8b949e]" />
                          <span>Settings</span>
                        </button>
                      </Link>
                      <button className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-md text-left text-[#c9d1d9] hover:bg-[#21262d] hover:text-white transition">
                        <Paintbrush className="w-3.5 h-3.5 text-[#8b949e]" />
                        <span>Appearance</span>
                      </button>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-md text-left text-[#f85149] hover:bg-[#f85149]/10 transition"
                      >
                        <LogOut className="w-3.5 h-3.5 text-[#f85149]" />
                        <span>Sign out</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <a href="/login" className="text-xs font-semibold text-neutral-600 hover:text-neutral-950 px-3 py-1.5 transition">
                Log in
              </a>
              <a href="/signup" className="bg-neutral-900 text-white rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-neutral-800 shadow-sm transition">
                Sign up
              </a>
            </div>
          )}
        </div>

      </nav>

      {mobileSearchOpen && (
        <div className="md:hidden border-b border-neutral-200 bg-white px-4 py-3 relative z-40">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              autoFocus
              type="text"
              placeholder="Search notebooks and @pings..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-9 pl-8 pr-4 rounded-md border border-neutral-200 bg-neutral-50/50 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-300 focus:bg-white transition-all"
            />
          </div>
          {searchQuery.length > 0 && (
            <div className="mt-2 rounded-xl bg-[#0d1117] border border-[#30363d] overflow-hidden">
              <SearchResultsPanel />
            </div>
          )}
        </div>
      )}

      {!loading && profileData && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-neutral-200 h-16 grid grid-cols-5 items-center px-2">

          <a href="/" className="flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-neutral-900 transition">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </a>

          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-neutral-900 transition relative"
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              {(notifications?.length ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-neutral-900 ring-2 ring-white" />
              )}
            </div>
            <span className="text-[10px] font-medium">Alerts</span>
          </button>

          <div className="relative flex justify-center">
            <button
              onClick={handleNewNotebookClick}
              className="absolute -top-6 w-14 h-14 rounded-full bg-neutral-900 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform ring-4 ring-white"
              title="New Notebook"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          <Link href="/?trending=1" className="flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-neutral-900 transition">
            <Flame className="w-5 h-5" />
            <span className="text-[10px] font-medium">Trending</span>
          </Link>

          <Link href="/settings" className="flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-neutral-900 transition">
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>

        </nav>
      )}

      {notifOpen && (
        <div className="md:hidden fixed inset-x-4 bottom-20 z-50 rounded-xl bg-[#0d1117] border border-[#30363d] shadow-2xl text-[#c9d1d9] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-[60vh]">
          <div className="p-3 border-b border-[#30363d] flex items-center justify-between">
            <span className="text-xs font-bold text-white">Notifications</span>
            <button onClick={() => setNotifOpen(false)} className="p-1 rounded-md text-[#8b949e] hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto [scrollbar-width:none] flex flex-col divide-y divide-[#30363d]">
            {notifications.length === 0 ? (
              <div className="p-6 text-center flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#8b949e]" />
                <p className="text-xs text-[#8b949e]">You're all caught up.</p>
              </div>
            ) : (
              notifications.map((notif) => <NotificationRow key={notif.$id} notif={notif} />)
            )}
          </div>
        </div>
      )}

      {!loading && profileData && <div className="md:hidden h-16" />}
    </>
  );
}