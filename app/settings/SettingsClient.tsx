"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logOut } from "@/lib/auth";
import {
  getPingByUserId,
  updateProfile,
  getNotebooksForUser,
  deleteNotebookCascade,
} from "@/lib/appwrite";
import { Camera, User, Trash2, AlertTriangle, Book, Lock } from "lucide-react";

export default function SettingsClient() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profileDoc, setProfileDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
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

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
        const MAX = 120;
        canvas.width = MAX;
        canvas.height = MAX;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, MAX, MAX);
        setAvatarDataUrl(canvas.toDataURL("image/jpeg", 0.6));
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
      await updateProfile(profileDoc.$id, {
        name,
        bio,
        location,
        website,
        twitter,
        github,
        avatar_url: avatarDataUrl,
      });
      setSaveStatus("Saved successfully");
    } catch (err) {
      console.error("Failed to save profile:", err);
      setSaveStatus("Failed to save — Try again later ");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNotebook = async (notebookId: string) => {
    if (!confirm("Are you sure you want to Delete this notebook and all its chapters? This can't be undone.")) return;
    setDeletingNotebookId(notebookId);
    try {
      await deleteNotebookCascade(notebookId);
      setNotebooks((prev) => prev.filter((nb) => nb.$id !== notebookId));
    } catch (err) {
      console.error("Failed to delete notebook:", err);
      alert("Failed to delete notebook — Try again later");
    } finally {
      setDeletingNotebookId(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE" || !user) return;
    setDeletingAccount(true);
    setDeleteError("");
    try {
      await Promise.all(notebooks.map((nb) => deleteNotebookCascade(nb.$id)));

      if (profileDoc) {
        const { databases, DATABASE_ID, PINGS_COLLECTION_ID } = await import("@/lib/appwrite");
        await databases.deleteDocument(DATABASE_ID, PINGS_COLLECTION_ID, profileDoc.$id);
      }

      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.$id }),
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
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-neutral-400 animate-pulse">Loading settings...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-10">

        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>

        <section className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Profile</h2>

          <div className="flex items-center gap-4">
            <label className="relative group cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden">
                {avatarDataUrl ? (
                  <img src={avatarDataUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-neutral-400" />
                )}
                <div className="absolute inset-0 bg-neutral-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-full">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </div>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            <div>
              <p className="text-sm font-medium text-neutral-900">@{profileDoc?.handle}</p>
              <p className="text-xs text-neutral-400">Click your avatar to change it</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-neutral-600 block mb-1">Display Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-600 block mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 resize-none"
              />
            </div>
          </div>
        </section>

        <section className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Links & Location</h2>

          <div>
            <label className="text-xs font-semibold text-neutral-600 block mb-1">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lusaka, Zambia"
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-600 block mb-1">Website</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="yourdomain.com"
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-600 block mb-1">Social Link</label>
            <input
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="username"
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-600 block mb-1">Social link</label>
            <input
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              placeholder="username"
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50 transition"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {saveStatus && <span className="text-xs text-neutral-500">{saveStatus}</span>}
          </div>
        </section>

        <section className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">Your Notebooks</h2>

          {notebooks.length === 0 ? (
            <p className="text-xs text-neutral-400 italic">You haven't created any notebooks yet.</p>
          ) : (
            <div className="space-y-2">
              {notebooks.map((nb) => (
                <div
                  key={nb.$id}
                  className="flex items-center justify-between gap-3 border border-neutral-100 rounded-lg px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Book className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="text-sm font-medium text-neutral-900 truncate">{nb.title}</span>
                    {!nb.is_public && <Lock className="w-3 h-3 text-neutral-400 shrink-0" />}
                  </div>
                  <button
                    onClick={() => handleDeleteNotebook(nb.$id)}
                    disabled={deletingNotebookId === nb.$id}
                    className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition shrink-0 disabled:opacity-50"
                    title="Delete notebook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-red-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide">Danger Zone</h2>
          </div>
          <p className="text-xs text-neutral-500">
            Deleting your account permanently removes your profile, notebooks, and chapters. This cannot be undone.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-600 block">
              Type <span className="font-mono bg-neutral-100 px-1 rounded">DELETE</span> to confirm
            </label>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-red-400"
            />
          </div>

          {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}

          <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirmText !== "DELETE" || deletingAccount}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-40 transition"
          >
            {deletingAccount ? "Deleting..." : "Delete My Account"}
          </button>
        </section>

      </div>
    </main>
  );
}
