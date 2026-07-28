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
  Search, Bell, Plus, User, Book, Heart, Settings,
  Paintbrush, LogOut, ArrowLeftRight, Home, Info, AlertCircle, Trash2, UserPlus, X, Flame, Check, BarChart3
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import HoverCard from "@/components/HoverCard";

// Helper function to format timestamps into relative time strings
function formatRelativeTime(dateString?: string) {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  return `${Math.floor(diffInDays / 365)}y ago`;
}

export default function Navbar() {
  const [profileData, setProfileData] = useState<{
    handle: string;
    name: string;
    avatarUrl: string;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

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
  const [showNavbar, setShowNavbar] = useState(true);
  const lastScrollY = useRef(0);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
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
          if (notifs.length > 0) {
            setHasUnread(true);
          }
        } catch (err) {
          console.error("Failed to load notifications:", err);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY.current) {
        setShowNavbar(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setShowNavbar(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!document.body.contains(target)) return;

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(target) &&
        (!mobileNotifRef.current || !mobileNotifRef.current.contains(target))
      ) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleNotifications = () => {
    if (!notifOpen) {
      setHasUnread(false);
    }
    setNotifOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    await logOut();
    setProfileData(null);
    router.push("/");
    router.refresh();
  };

  const handleDismissNotification = async (id: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
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
    <div className="p-2 flex flex-col gap-1 max-h-72 overflow-y-auto [scrollbar-width:none]">
      {searching ? (
        <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-neutral-400 italic">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Searching...</span>
        </div>
      ) : !hasResults ? (
        <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-neutral-400 italic">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>No results found</span>
        </div>
      ) : (
        <>
          {searchResults.pings.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">People</p>
              {searchResults.pings.map((p) => {
                const avatar = p.avatar_url || p.avatarUrl;
                return (
                  <HoverCard key={p.$id} handle={p.handle}>
                    <a
                      href={`/${p.handle}`}
                      onClick={handleSearchResultClick}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-neutral-100 text-xs transition-colors duration-150 group"
                    >
                      <div className="w-6 h-6 rounded-full bg-neutral-200 overflow-hidden flex items-center justify-center shrink-0 border border-neutral-200 shadow-sm">
                        {avatar ? (
                          <img src={avatar} alt={p.handle} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-neutral-700 uppercase">{p.handle.charAt(0)}</span>
                        )}
                      </div>
                      <span className="text-neutral-900 font-medium group-hover:text-[#0084FF] transition-colors truncate">
                        @{p.handle}
                      </span>
                    </a>
                  </HoverCard>
                );
              })}
            </div>
          )}
          {searchResults.notebooks.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Notebooks</p>
              {searchResults.notebooks.map((nb) => (
                <a
                  key={nb.$id}
                  href={`/notebooks/${nb.$id}`}
                  onClick={handleSearchResultClick}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-neutral-100 text-xs transition-colors duration-150 text-neutral-800 font-medium group"
                >
                  <div className="w-6 h-6 rounded-lg bg-neutral-200/60 flex items-center justify-center shrink-0 text-neutral-500 group-hover:bg-blue-50 group-hover:text-[#0084FF] transition-colors">
                    <Book className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate group-hover:text-[#0084FF] transition-colors">{nb.title}</span>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const NotificationRow = ({ notif }: { notif: any }) => {
    const [offsetX, setOffsetX] = useState(0);
    const touchStartX = useRef(0);
    const isSwiping = useRef(false);

    const targetLink =
      notif.chapter_id ? `/chapters/${notif.chapter_id}` :
      notif.chapterId ? `/chapters/${notif.chapterId}` :
      notif.notebook_id ? `/notebooks/${notif.notebook_id}` :
      notif.notebookId ? `/notebooks/${notif.notebookId}` :
      notif.target_url || notif.url || (notif.type === "follow" ? `/${notif.sender_handle}` : null);

    const handleTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      isSwiping.current = true;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isSwiping.current) return;
      const currentX = e.touches[0].clientX;
      const diff = currentX - touchStartX.current;

      if (diff < 0) {
        setOffsetX(Math.max(diff, -80));
      } else if (diff > 0 && offsetX < 0) {
        setOffsetX(Math.min(0, offsetX + diff));
      }
    };

    const handleTouchEnd = () => {
      isSwiping.current = false;
      if (offsetX < -40) {
        setOffsetX(-70);
      } else {
        setOffsetX(0);
      }
    };

    const handleRowClick = () => {
      if (Math.abs(offsetX) > 10) return;
      if (targetLink) {
        setNotifOpen(false);
        router.push(targetLink);
      }
    };

    return (
      <div className="relative overflow-hidden bg-white rounded-xl border border-neutral-200/80 shadow-sm transition-all duration-200 shrink-0">
        <div className="sm:hidden absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-neutral-100 rounded-r-xl">
          <button
            onClick={(e) => handleDismissNotification(notif.$id, e)}
            className="w-full h-full flex flex-col items-center justify-center text-neutral-600 hover:text-red-600 text-[10px] font-bold gap-1 active:bg-neutral-200 transition-colors"
            title="Delete notification"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>

        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleRowClick}
          style={{ transform: `translateX(${offsetX}px)` }}
          className={`relative bg-white p-3.5 flex items-start justify-between gap-3 hover:bg-neutral-50/80 transition-transform duration-200 ease-out group select-none rounded-xl ${
            targetLink ? "cursor-pointer" : ""
          }`}
        >
          <div className="flex gap-3 min-w-0">
            <div className="mt-0.5 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
              <UserPlus className="w-4 h-4 text-[#0084FF]" />
            </div>
            <div className="flex flex-col min-w-0 text-xs">
              <div className="text-neutral-700 font-normal leading-relaxed break-words">
                <HoverCard handle={notif.sender_handle}>
                  <a
                    href={`/${notif.sender_handle}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-neutral-900 font-bold hover:underline cursor-pointer inline-block"
                  >
                    @{notif.sender_handle}
                  </a>
                </HoverCard>{" "}
                {notif.type === "like"
                  ? "liked your chapter."
                  : notif.type === "comment"
                  ? "commented on your chapter."
                  : notif.type === "collab_invite"
                  ? "invited you to collaborate on a notebook."
                  : "started following you."}
              </div>

              {notif.type === "collab_invite" ? (
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <button
                    onClick={(e) => handleInviteResponse(notif.invite_id, true, notif.$id, e)}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-[#0084FF] hover:bg-[#0073e6] text-white rounded-xl px-3 py-1.5 shadow-sm transition-all duration-150"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept
                  </button>
                  <button
                    onClick={(e) => handleInviteResponse(notif.invite_id, false, notif.$id, e)}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl px-3 py-1.5 transition-all duration-150"
                  >
                    <X className="w-3.5 h-3.5" /> Decline
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-neutral-400 mt-1 font-medium">
                  {formatRelativeTime(notif.$createdAt || notif.created_at)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={(e) => handleDismissNotification(notif.$id, e)}
            className="hidden sm:flex p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-neutral-100 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0"
            title="Dismiss alert"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`sticky top-0 z-50 transition-transform duration-300 ${showNavbar ? "translate-y-0" : "-translate-y-full"}`}>
        <nav className="flex items-center justify-between px-3 sm:px-6 py-1 border-b border-neutral-200 bg-white/95 backdrop-blur-md select-none h-14 relative z-50 shadow-sm box-border w-full">

          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <a href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-neutral-900 flex items-center justify-center text-white font-black overflow-hidden shadow-sm shrink-0">
                <Image src="/logo.png" alt="Ping Logo" width={120} height={120} className="object-contain" priority />
              </div>
              <span className="font-bold text-base tracking-tight text-neutral-900">PING</span>
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="relative hidden md:block" ref={searchRef}>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (searchQuery.length > 0) setSearchOpen(true);
                }}
                className="w-64 h-9 pl-9 pr-4 rounded-xl border border-neutral-200 bg-neutral-100/60 text-xs font-normal text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#0084FF] focus:ring-2 focus:ring-[#0084FF]/20 focus:bg-white transition-all duration-200 ease-in-out"
              />

              {searchOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-neutral-200/80 shadow-2xl text-neutral-800 flex flex-col overflow-hidden transition-all duration-200 ease-in-out animate-in fade-in slide-in-from-top-2 box-border z-50">
                  <div className="p-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                      Search Results
                    </span>
                    <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full truncate max-w-[150px]">
                      &quot;{searchQuery}&quot;
                    </span>
                  </div>
                  <SearchResultsPanel />
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition-all duration-150 shrink-0"
              aria-label="Toggle search"
            >
              {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>

            {loading ? (
              <div className="w-8 h-8 rounded-full bg-neutral-100 animate-pulse shrink-0" />
            ) : profileData ? (
              <>
                <button
                  onClick={handleNewNotebookClick}
                  className="hidden md:flex h-9 pl-3 pr-4 rounded-full bg-[#0084FF] hover:bg-[#0073e6] active:bg-[#0062c4] text-white font-medium text-xs items-center gap-1.5 shadow-sm transition-all duration-150 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Notebook</span>
                </button>

                <a
                  href="/"
                  title="View Feed Dashboard"
                  className="hidden md:flex w-8 h-8 rounded-xl items-center justify-center border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-600 transition-all duration-150 shrink-0"
                >
                  <Home className="w-4 h-4" />
                </a>

                <div className="relative hidden md:block" ref={notifRef}>
                  <button
                    onClick={handleToggleNotifications}
                    className="w-8 h-8 rounded-xl flex items-center justify-center border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-600 transition-all duration-150 relative shrink-0"
                  >
                    <Bell className="w-4 h-4" />
                    {hasUnread && notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-[#0084FF] text-white text-[9px] font-extrabold rounded-full shadow-sm flex items-center justify-center ring-2 ring-white animate-pulse">
                        {notifications.length}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-88 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-neutral-200/80 shadow-2xl text-neutral-800 flex flex-col overflow-hidden transition-all duration-200 ease-in-out animate-in fade-in slide-in-from-top-2 box-border z-50">
                      <div className="p-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                        <span className="text-xs font-bold text-neutral-900">Notification center</span>
                        <span className="text-[10px] text-[#0084FF] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full font-bold">
                          {notifications.length} Total
                        </span>
                      </div>

                      <div className="max-h-72 overflow-y-auto [scrollbar-width:none] flex flex-col gap-2.5 p-2.5 bg-neutral-50/30">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                            <AlertCircle className="w-5 h-5 text-neutral-300" />
                            <p className="text-xs text-neutral-500">It looks like there are no notifications.</p>
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
                    className="w-8 h-8 rounded-full border border-neutral-200 overflow-hidden bg-neutral-50 flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:opacity-95 active:scale-95 transition-all duration-150"
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
                    <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white border border-neutral-200/80 shadow-2xl text-neutral-800 flex flex-col overflow-hidden transition-all duration-200 ease-in-out animate-in fade-in slide-in-from-top-2 z-50 box-border">

                      <div className="p-4 border-b border-neutral-100 flex items-center justify-between gap-3 bg-neutral-50/50">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200 border border-neutral-200 flex items-center justify-center shrink-0 shadow-sm">
                            {profileData.avatarUrl ? (
                              <img src={profileData.avatarUrl} alt="Menu Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-xs text-neutral-700 uppercase">{profileData.handle.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-neutral-900 truncate leading-tight">@{profileData.handle}</span>
                            <span className="text-[11px] text-neutral-500 truncate mt-0.5">{profileData.name}</span>
                          </div>
                        </div>
                        <button className="p-1.5 rounded-xl hover:bg-neutral-200/60 text-neutral-500 hover:text-neutral-900 transition-colors shrink-0">
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="p-2 border-b border-neutral-100 flex flex-col gap-0.5">
                        <a href={`/${profileData.handle}`} onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors duration-150">
                          <User className="w-4 h-4 text-neutral-400 shrink-0" />
                          <span>Profile</span>
                        </a>
                        <a href={`/${profileData.handle}`} onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors duration-150">
                          <Book className="w-4 h-4 text-neutral-400 shrink-0" />
                          <span>Notebooks</span>
                        </a>
                        <Link href="/community" onClick={() => setProfileOpen(false)}>
                          <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-left text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors duration-150">
                            <Heart className="w-4 h-4 text-neutral-400 shrink-0" />
                            <span>Community</span>
                          </button>
                        </Link>
                        
                        <Link href="/analytics" onClick={() => setProfileOpen(false)}>
                          <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-left text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors duration-150">
                            <BarChart3 className="w-4 h-4 text-neutral-400 shrink-0" />
                            <span>Analytics</span>
                          </button>
                        </Link>
                      </div>

                      <div className="p-2 border-b border-neutral-100 flex flex-col gap-0.5">
                        <Link href="/settings" onClick={() => setProfileOpen(false)}>
                          <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-left text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors duration-150">
                            <Settings className="w-4 h-4 text-neutral-400 shrink-0" />
                            <span>Settings</span>
                          </button>
                        </Link>
                        <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-left text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors duration-150">
                          <Paintbrush className="w-4 h-4 text-neutral-400 shrink-0" />
                          <span>Appearance</span>
                        </button>
                      </div>

                      <div className="p-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-left text-red-600 hover:bg-red-50 transition-colors duration-150"
                        >
                          <LogOut className="w-4 h-4 text-red-500 shrink-0" />
                          <span>Sign out</span>
                        </button>
                      </div>

                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <a href="/login" className="text-xs font-semibold text-neutral-600 hover:text-neutral-950 px-2.5 py-1.5 transition-colors whitespace-nowrap">
                  Log in
                </a>
                <a href="/signup" className=" bg-[#0084FF] hover:bg-[#0073e6] active:bg-[#0062c4] text-white rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm transition-all whitespace-nowrap">
                  Sign up
                </a>
              </div>
            )}
          </div>

        </nav>
      </div>

      {mobileSearchOpen && (
        <div className="md:hidden border-b border-neutral-200 bg-white px-3 sm:px-4 py-3 relative z-40 animate-in fade-in slide-in-from-top-2 duration-150 shadow-md box-border w-full">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              autoFocus
              type="text"
              placeholder="Search notebooks and @pings..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-neutral-200 bg-neutral-100/60 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#0084FF] focus:ring-2 focus:ring-[#0084FF]/20 focus:bg-white transition-all box-border"
            />
          </div>
          {searchQuery.length > 0 && (
            <div className="mt-2 rounded-2xl bg-white border border-neutral-200/80 shadow-xl overflow-hidden box-border">
              <SearchResultsPanel />
            </div>
          )}
        </div>
      )}

      {!loading && profileData && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 h-16 grid grid-cols-5 items-center px-1 shadow-lg box-border w-full">
          <a href="/" className="flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-neutral-900 transition-colors py-1 min-w-0">
            <Home className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-medium truncate w-full text-center">Home</span>
          </a>

          <button
            onClick={handleToggleNotifications}
            className="flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-neutral-900 transition-colors relative py-1 min-w-0"
          >
            <div className="relative">
              <Bell className="w-5 h-5 shrink-0" />
              {hasUnread && notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-[#0084FF] text-white text-[9px] font-extrabold rounded-full shadow-sm flex items-center justify-center ring-2 ring-white animate-pulse">
                  {notifications.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium truncate w-full text-center">Alerts</span>
          </button>

          <div className="relative flex justify-center min-w-0">
            <button
              onClick={handleNewNotebookClick}
              className="absolute -top-6 w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#0084FF] hover:bg-[#0073e6] text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform ring-4 ring-white shrink-0"
              title="New Notebook"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          <Link href="/?trending=1" className="flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-neutral-900 transition-colors py-1 min-w-0">
            <Flame className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-medium truncate w-full text-center">Trending</span>
          </Link>

          <Link href="/settings" className="flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-neutral-900 transition-colors py-1 min-w-0">
            <Settings className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-medium truncate w-full text-center">Settings</span>
          </Link>
        </nav>
      )}

      {notifOpen && (
        <div ref={mobileNotifRef} className="md:hidden fixed inset-x-3 sm:inset-x-4 bottom-20 z-50 rounded-2xl bg-white border border-neutral-200/80 shadow-2xl text-neutral-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-[60vh] box-border">
          <div className="p-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 shrink-0">
            <span className="text-xs font-bold text-neutral-900">Notifications</span>
            <button onClick={() => setNotifOpen(false)} className="p-1 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto [scrollbar-width:none] flex flex-col gap-2.5 p-2.5 bg-neutral-50/30 min-h-0">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5 text-neutral-300" />
                <p className="text-xs text-neutral-500">You&apos;re all caught up.</p>
              </div>
            ) : (
              notifications.map((notif) => <NotificationRow key={notif.$id} notif={notif} />)
            )}
          </div>
        </div>
      )}
    </>
  );
}