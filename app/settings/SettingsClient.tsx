"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logOut } from "@/lib/auth";
import {
  getPingByUserId,
  updateProfile,
  getNotebooksForUser,
  deleteNotebookCascade,
  account,
  databases,
  DATABASE_ID,
  PINGS_COLLECTION_ID,
} from "@/lib/appwrite";
import { Query } from "appwrite";
import { Camera, User, Trash2, AlertTriangle, Book, Lock, Info, Bell, Share2, CreditCard, FileText, ShieldCheck, ChevronRight } from "lucide-react";
import { Button, toast } from "@heroui/react";

export default function SettingsClient() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profileDoc, setProfileDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active navigation tab state: default to "Account" on web to fix white screen issue
  const [activeTab, setActiveTab] = useState<
    "Account" | "Notifications" | "Social Links" | "Billing" | "Notebooks" | "Rules" | "Privacy Policy" | "Main"
  >("Account");

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [github, setGithub] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [deletingNotebookId, setDeletingNotebookId] = useState<string | null>(null);
  const [notebookToDelete, setNotebookToDelete] = useState<any | null>(null);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Modal visibility states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  // Dynamic Page Title Effect
  useEffect(() => {
    document.title = "Ping | Settings";
  }, []);

  useEffect(() => {
    async function load() {
      const activeUser = await getCurrentUser();
      if (!activeUser) {
        router.push("/login");
        return;
      }
      setUser(activeUser);

      const ping = await getPingByUserId(activeUser.$id);
      if (ping) {
        setProfileDoc(ping);
        setName(ping.name || "");
        setHandle(ping.handle || "");
        setBio(ping.bio || "");
        setLocation(ping.location || "");
        setWebsite(ping.website || "");
        setTwitter(ping.twitter || "");
        setGithub(ping.github || "");
        setAvatarDataUrl(ping.avatar_url || "");
      }

      const nbs = await getNotebooksForUser(activeUser.$id, false);
      setNotebooks(nbs);

      setLoading(false);
    }
    load();
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX) {
            height *= MAX / width;
            width = MAX;
          }
        } else {
          if (height > MAX) {
            width *= MAX / height;
            height = MAX;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        setAvatarDataUrl(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!profileDoc) return;
    setSaving(true);
    setSaveStatus("");
    try {
      const trimmedHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (trimmedHandle && trimmedHandle !== profileDoc.handle) {
        const existing = await databases.listDocuments(
          DATABASE_ID,
          PINGS_COLLECTION_ID,
          [Query.equal("handle", trimmedHandle), Query.limit(1)]
        );
        if (existing.documents.length > 0) {
          toast("Handle taken", { description: "This handle is already in use by another author." });
          setSaving(false);
          return;
        }
      }

      await updateProfile(profileDoc.$id, {
        name,
        handle: trimmedHandle || profileDoc.handle,
        bio,
        location,
        website,
        twitter,
        github,
        avatar_url: avatarDataUrl,
      });

      setProfileDoc((prev: any) => ({ ...prev, handle: trimmedHandle || prev.handle }));
      setSaveStatus("Saved successfully");
      toast("Profile updated", {
        description: "Your profile changes have been saved successfully.",
      });
    } catch (err) {
      console.error("Failed to save profile:", err);
      setSaveStatus("Failed to save — Try again later");
      toast("Save failed", {
        description: "Failed to save profile changes. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNotebook = async (notebookId: string) => {
    setDeletingNotebookId(notebookId);
    try {
      await deleteNotebookCascade(notebookId);
      setNotebooks((prev) => prev.filter((nb) => nb.$id !== notebookId));
      toast("Notebook deleted", {
        description: "The notebook and all its chapters have been permanently deleted.",
      });
    } catch (err) {
      console.error("Failed to delete notebook:", err);
      toast("Deletion failed", {
        description: "Failed to delete notebook — Try again later",
      });
    } finally {
      setDeletingNotebookId(null);
      setNotebookToDelete(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE" || !user) return;
    setDeletingAccount(true);
    setDeleteError("");
    try {
      await Promise.all(notebooks.map((nb) => deleteNotebookCascade(nb.$id)));

      if (profileDoc) {
        await databases.deleteDocument(DATABASE_ID, PINGS_COLLECTION_ID, profileDoc.$id);
      }

      const { jwt } = await account.createJWT();
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }

      await logOut();
      router.push("/");
    } catch (err: any) {
      console.error("Failed to delete account:", err);
      setDeleteError(err.message || "Something went wrong. Please try again.");
    } finally {
      setDeletingAccount(false);
      setShowDeleteAccountModal(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 bg-transparent text-neutral-900 dark:text-neutral-100 select-none animate-pulse">
        {/* Header Skeleton */}
        <div className="space-y-2 hidden sm:block">
          <div className="h-7 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
          <div className="h-4 w-64 bg-neutral-100 dark:bg-neutral-900 rounded-lg" />
        </div>

        {/* Desktop Tabs Skeleton */}
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-9 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-xl shrink-0" />
          ))}
        </div>

        {/* Mobile Main Menu / Content Skeleton */}
        <div className="sm:hidden space-y-4">
          <div className="h-20 bg-neutral-200 dark:bg-neutral-800 rounded-2xl w-full" />
          <div className="space-y-2">
            <div className="h-3 w-28 bg-neutral-200 dark:bg-neutral-800 rounded ml-1" />
            <div className="bg-neutral-200 dark:bg-neutral-800 rounded-2xl h-60 w-full" />
          </div>
        </div>

        {/* Desktop Main Content Area Skeleton */}
        <div className="hidden sm:block bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 space-y-6">
          <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-3 w-48 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
            <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          </div>
          <div className="h-24 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-10 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 bg-transparent text-neutral-900 dark:text-neutral-100 select-none transition-colors">
      
      {/* Header section / Back button for mobile view when inside a tab */}
      {activeTab !== "Main" && (
        <div className="sm:hidden flex items-center pb-2">
          <button
            onClick={() => setActiveTab("Main")}
            className="text-xs font-semibold text-[#0084FF] flex items-center gap-1"
          >
            ← Back to settings
          </button>
        </div>
      )}

      <div className="space-y-1 hidden sm:block">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Settings</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Manage your account settings and preferences</p>
      </div>

      {/* Desktop Pill Navigation Bar */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { name: "Account", icon: User },
          { name: "Notifications", icon: Bell },
          { name: "Social Links", icon: Share2 },
          { name: "Billing", icon: CreditCard },
          { name: "Notebooks", icon: Book },
          { name: "Rules", icon: FileText },
          { name: "Privacy Policy", icon: ShieldCheck },
        ].map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
                isActive
                  ? "bg-neutral-950 dark:bg-white text-white dark:text-neutral-900 shadow-md"
                  : "bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Mobile Main Menu Style (Matching Screenshot Layout) */}
      {activeTab === "Main" && (
        <div className="sm:hidden space-y-4 animate-fadeIn">
          {/* Profile Card Header */}
          <div
            onClick={() => setActiveTab("Account")}
            className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                {avatarDataUrl ? (
                  <img src={avatarDataUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">{name || profileDoc?.name || "User"}</p>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">@{handle || profileDoc?.handle || "user"}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-1">Other settings</p>
            
            {/* Group 1 */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden shadow-sm">
              <button
                onClick={() => setActiveTab("Account")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition"
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">Profile details</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => setActiveTab("Notebooks")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition"
              >
                <div className="flex items-center gap-3">
                  <Book className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">Notebooks</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => setActiveTab("Notifications")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">Notifications</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => setActiveTab("Social Links")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition"
              >
                <div className="flex items-center gap-3">
                  <Share2 className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">Social Links</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => setActiveTab("Billing")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">Billing</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              </button>
            </div>

            {/* Group 2 */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden shadow-sm">
              <button
                onClick={() => setActiveTab("Rules")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">About application</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => setActiveTab("Privacy Policy")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">Privacy Policy</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              </button>

              <button
                onClick={() => setActiveTab("Account")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">Deactivate my account</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content Panels (Always displayed on Desktop or when active on Mobile) */}
      <div className={`${activeTab === "Main" ? "hidden sm:block" : "block"}`}>
        {activeTab === "Account" && (
          <div className="space-y-6 animate-fadeIn">
            <section className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
              <h2 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Profile Information</h2>

              <div className="flex items-center gap-4">
                <label className="relative group cursor-pointer">
                  <div className="w-14 h-14 rounded-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                    {avatarDataUrl ? (
                      <img src={avatarDataUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                    )}
                    <div className="absolute inset-0 bg-neutral-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-full">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">@{handle || profileDoc?.handle || "user"}</p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">Click your avatar to upload a new profile photo</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">Display Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#0084FF] transition-colors shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">Handle (@username)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 dark:text-neutral-500 font-medium">@</span>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      placeholder="yourhandle"
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-7 pr-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#0084FF] transition-colors shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Write a short author bio..."
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#0084FF] transition-colors resize-none shadow-sm"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onPress={handleSaveProfile}
                  isDisabled={saving}
                  className="bg-[#0084FF] hover:bg-[#0073e6] text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50 transition h-auto min-w-0 shadow-sm border-0"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                {saveStatus && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{saveStatus}</span>}
              </div>
            </section>

            {/* Danger Zone */}
            <section className="bg-white dark:bg-neutral-900 border border-red-200/80 dark:border-red-900/50 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h2 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Danger Zone</h2>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Deleting your account permanently removes your profile, notebooks, and chapters. This cannot be undone.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                  Type <span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-900 dark:text-white">DELETE</span> to confirm
                </label>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-red-400 transition-colors shadow-sm"
                />
              </div>

              {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}

              <Button
                onPress={() => setShowDeleteAccountModal(true)}
                isDisabled={deleteConfirmText !== "DELETE" || deletingAccount}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-40 transition h-auto min-w-0 shadow-sm border-0"
              >
                {deletingAccount ? "Deleting..." : "Delete My Account"}
              </Button>
            </section>
          </div>
        )}

        {activeTab === "Notebooks" && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm animate-fadeIn">
            <h2 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Notebooks Settings</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Manage all your created notebooks and privacy settings.</p>

            {notebooks.length === 0 ? (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 italic pt-2">You haven't created any notebooks yet.</p>
            ) : (
              <div className="space-y-2 pt-2">
                {notebooks.map((nb) => (
                  <div
                    key={nb.$id}
                    className="flex items-center justify-between gap-3 border border-neutral-100 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 bg-neutral-50/50 dark:bg-neutral-800/40 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Book className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
                      <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">{nb.title}</span>
                      {!nb.is_public && <Lock className="w-3 h-3 text-neutral-400 dark:text-neutral-500 shrink-0" />}
                    </div>
                    <Button
                      onPress={() => setNotebookToDelete(nb)}
                      isDisabled={deletingNotebookId === nb.$id}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0 disabled:opacity-50 h-auto min-w-0 bg-transparent border-0 shadow-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "Social Links" && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm animate-fadeIn">
            <h2 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Links & Social Profiles</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Kitwe, Zambia"
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#0084FF] transition-colors shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">Website</label>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="joel-musonda.framer.website"
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#0084FF] transition-colors shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">Twitter / X Username</label>
                <input
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="github.com/joel-musonda"
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#0084FF] transition-colors shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">GitHub Username</label>
                <input
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="Instagram.com/joel__musonda"
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#0084FF] transition-colors shadow-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onPress={() => setShowSaveModal(true)}
                isDisabled={saving}
                className="bg-[#0084FF] hover:bg-[#0073e6] text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50 transition h-auto min-w-0 shadow-sm border-0"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              {saveStatus && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{saveStatus}</span>}
            </div>
          </div>
        )}

        {activeTab === "Notifications" && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm animate-fadeIn">
            <h2 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Notification Preferences</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Manage how you receive alerts and updates about your notebooks and followers.</p>
            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">Email Notifications for Likes & Comments</p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">Receive an email when someone interacts with your notebook.</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded accent-[#0084FF] w-4 h-4 cursor-pointer" />
              </label>
              <label className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">New Follower Alerts</p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">Get notified when a new writer follows your account.</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded accent-[#0084FF] w-4 h-4 cursor-pointer" />
              </label>
            </div>
          </div>
        )}

        {activeTab === "Billing" && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm animate-fadeIn">
            <h2 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Billing & Subscription</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">You are currently on the <span className="font-bold text-neutral-900 dark:text-white">Free Creator Plan</span>.</p>
            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-neutral-900 dark:text-white">Ping Pro Tier</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Unlock advanced custom domains and unlimited analytics storage.</p>
              </div>
              <button onClick={() => alert("Pro tier upgrade coming soon!")} className="px-3.5 py-1.5 bg-[#0084FF] text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-[#0073e6] transition-colors">
                Upgrade
              </button>
            </div>
          </div>
        )}

        {activeTab === "Rules" && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm animate-fadeIn">
            <h2 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Community Rules & Guidelines</h2>
            <div className="space-y-3 pt-1 text-xs text-neutral-600 dark:text-neutral-300">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <p className="font-bold text-neutral-900 dark:text-white">1. Be Respectful and Constructive</p>
                <p className="text-neutral-500 dark:text-neutral-400">Treat all writers, readers, and community members with dignity. Harassment, hate speech, bullying, or abusive language of any kind will result in an immediate account ban.</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <p className="font-bold text-neutral-900 dark:text-white">2. Share Authentic Content</p>
                <p className="text-neutral-500 dark:text-neutral-400">Document your genuine thoughts, lessons, life reflections, and technical insights. Avoid uploading automated spam, plagiarized text, or misleading information.</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <p className="font-bold text-neutral-900 dark:text-white">3. Respect Intellectual Property</p>
                <p className="text-neutral-500 dark:text-neutral-400">Only publish notebooks and chapters that you own or have explicit legal permission to share. Give proper attribution where referencing external sources or quotes.</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <p className="font-bold text-neutral-900 dark:text-white">4. No Malicious Activity</p>
                <p className="text-neutral-500 dark:text-neutral-400">Do not attempt to exploit, hack, scrape, overload, or compromise the security infrastructure, databases, or API endpoints of Ping.</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <p className="font-bold text-neutral-900 dark:text-white">5. Safety First</p>
                <p className="text-neutral-500 dark:text-neutral-400">Do not share sensitive personally identifiable information (PII) such as government IDs, private financial details, or passwords within public notebooks.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Privacy Policy" && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm animate-fadeIn">
            <h2 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Privacy Policy</h2>
            <div className="space-y-3 pt-1 text-xs text-neutral-600 dark:text-neutral-300">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <p className="font-bold text-neutral-900 dark:text-white">1. Information We Collect</p>
                <p className="text-neutral-500 dark:text-neutral-400">We collect account credentials, profile details (name, handle, bio, avatar), and user-generated notebooks and chapters stored securely via Appwrite. We also gather standard diagnostic and usage telemetry to maintain application performance.</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <p className="font-bold text-neutral-900 dark:text-white">2. How We Use Your Data</p>
                <p className="text-neutral-500 dark:text-neutral-400">Your information is used strictly to authenticate your identity, display your public author profile, sync your notes across devices, and deliver core application features. Your personal information is never sold or rented to third-party advertisers.</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <p className="font-bold text-neutral-900 dark:text-white">3. Data Security</p>
                <p className="text-neutral-500 dark:text-neutral-400">We implement industry-standard encryption protocols and secure database access rules through Appwrite to protect your personal files and notes against unauthorized access, alteration, or disclosure.</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <p className="font-bold text-neutral-900 dark:text-white">4. User Control & Data Deletion</p>
                <p className="text-neutral-500 dark:text-neutral-400">You retain full ownership and copyright over all your written content. You can modify your public profile details at any time or permanently wipe your entire account, notebooks, and associated records instantly from the Account settings tab.</p>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <p className="font-bold text-neutral-900 dark:text-white">5. Cookies & Local Storage</p>
                <p className="text-neutral-500 dark:text-neutral-400">We utilize secure browser cookies and local storage tokens exclusively to maintain active user session authentication and remember your local UI preferences.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Changes Confirmation Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/45 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-[#0084FF]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white">Save social changes?</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Are you sure you want to update your links and social profiles?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  handleSaveProfile();
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-[#0084FF] hover:bg-[#0073e6] text-white rounded-xl transition shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Notebook Confirmation Modal */}
      {notebookToDelete && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/45 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white">Delete notebook permanently?</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  This will permanently delete <strong>{notebookToDelete.title}</strong> and all of its chapters.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setNotebookToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNotebook(notebookToDelete.$id)}
                disabled={deletingNotebookId === notebookToDelete.$id}
                className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition disabled:opacity-50 shadow-sm"
              >
                {deletingNotebookId === notebookToDelete.$id ? "Deleting..." : "Delete Notebook"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/45 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white">Delete account permanently?</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  This will permanently delete your profile, notebooks, and chapters. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteAccountModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition disabled:opacity-50 shadow-sm"
              >
                {deletingAccount ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}