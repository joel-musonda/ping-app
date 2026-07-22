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
import { Camera, User, Trash2, AlertTriangle, Book, Lock, Info, X } from "lucide-react";
import { Button, toast } from "@heroui/react";

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
  const [notebookToDelete, setNotebookToDelete] = useState<any | null>(null);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Modal visibility states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

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
      toast("Profile updated", {
        description: "Your profile changes have been saved successfully.",
      });
    } catch (err) {
      console.error("Failed to save profile:", err);
      setSaveStatus("Failed to save — Try again later ");
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
      setShowDeleteAccountModal(false);
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
            <Button
              onPress={() => setShowSaveModal(true)}
              isDisabled={saving}
              className="bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50 transition h-auto min-w-0"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
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
                  <div title="Delete notebook" className="inline-block">
                    <Button
                      onPress={() => setNotebookToDelete(nb)}
                      isDisabled={deletingNotebookId === nb.$id}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition shrink-0 disabled:opacity-50 h-auto min-w-0 bg-transparent border-0 shadow-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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

          <Button
            onPress={() => setShowDeleteAccountModal(true)}
            isDisabled={deleteConfirmText !== "DELETE" || deletingAccount}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-40 transition h-auto min-w-0"
          >
            {deletingAccount ? "Deleting..." : "Delete My Account"}
          </Button>
        </section>

      </div>

      {/* Save Changes Confirmation Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Save profile changes?</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Are you sure you want to update your profile information?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  handleSaveProfile();
                }}
                className="px-3 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Notebook Confirmation Modal */}
      {notebookToDelete && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Delete notebook permanently?</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  This will permanently delete <strong>{notebookToDelete.title}</strong> and all of its chapters.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setNotebookToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNotebook(notebookToDelete.$id)}
                disabled={deletingNotebookId === notebookToDelete.$id}
                className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {deletingNotebookId === notebookToDelete.$id ? "Deleting..." : "Delete Notebook"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Delete account permanently?</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  This will permanently delete your profile, notebooks, and chapters. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteAccountModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
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