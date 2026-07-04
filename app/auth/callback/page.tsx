"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { databases, DATABASE_ID, PINGS_COLLECTION_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, AlertCircle, Sparkles } from "lucide-react";

export default function OnboardingPage() {
  const [user, setUser] = useState<any>(null);
  const [profileDoc, setProfileDoc] = useState<any>(null);
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadDraftProfile() {
      const activeUser = await getCurrentUser();
      if (!activeUser) {
        router.push("/login");
        return;
      }
      setUser(activeUser);

      const res = await databases.listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [
        Query.equal("user_id", activeUser.$id),
      ]);

      if (res.documents.length > 0) {
        const doc = res.documents[0];
        setProfileDoc(doc);
        setHandle(doc.handle);
        setBio(doc.bio || "");
      }
    }
    loadDraftProfile();
  }, [router]);

  // Live real-time check to see if username handle is unique
  useEffect(() => {
    if (!handle || handle.trim() === "") {
      setIsAvailable(null);
      return;
    }

    const cleanHandle = handle.toLowerCase().replace(/[^a-z0-9_]/g, "");
    
    if (profileDoc && cleanHandle === profileDoc.handle) {
      setIsAvailable(true);
      return;
    }

    setIsChecking(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const check = await databases.listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [
          Query.equal("handle", cleanHandle),
        ]);
        setIsAvailable(check.documents.length === 0);
      } catch {
        setIsAvailable(false);
      } finally {
        setIsChecking(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [handle, profileDoc]);

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileDoc || !isAvailable || submitting) return;

    setSubmitting(true);
    const finalizedHandle = handle.toLowerCase().replace(/[^a-z0-9_]/g, "");

    try {
      // Completely removed the "name" attribute from the update request to prevent schema crashes
      await databases.updateDocument(DATABASE_ID, PINGS_COLLECTION_ID, profileDoc.$id, {
        handle: finalizedHandle,
        bio: bio,
        onboarded: true, 
      });

      router.push(`/${finalizedHandle}`);
    } catch (err) {
      console.error("Failed to complete profile onboarding update:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !profileDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm font-medium text-neutral-400 animate-pulse">Preparing configuration workspace...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 md:p-8 space-y-6">
        
        {/* Header Summary */}
        <div className="space-y-1.5 text-center">
          <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center mx-auto mb-2 text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Set up your profile</h1>
          <p className="text-xs text-neutral-500">Customize your workspace handle and tell the community what you are coding.</p>
        </div>

        <form onSubmit={handleCompleteSetup} className="space-y-4">

          {/* Unique Handle Input with Real-Time Validation */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="handle" className="text-xs font-semibold text-neutral-700">Unique Handle</Label>
              {isChecking && <span className="text-[10px] text-neutral-400 animate-pulse">Checking availability...</span>}
              {!isChecking && isAvailable === true && (
                <span className="text-[10px] text-green-600 flex items-center gap-0.5 font-medium">
                  <Check className="w-3 h-3" /> Handle available
                </span>
              )}
              {!isChecking && isAvailable === false && (
                <span className="text-[10px] text-red-500 flex items-center gap-0.5 font-medium">
                  <AlertCircle className="w-3 h-3" /> Taken or invalid
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 select-none">@</span>
              <Input 
                id="handle" 
                type="text" 
                placeholder="username"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="pl-7 border-neutral-200 bg-white focus-visible:ring-neutral-400 text-sm h-9"
                required
              />
            </div>
          </div>

          {/* Profile Bio Text Field */}
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs font-semibold text-neutral-700">Profile Bio</Label>
            <textarea 
              id="bio"
              rows={4}
              placeholder="Tell us a little bit about yourself, what you're building, or your interests..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white p-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400 shadow-sm resize-none transition-all"
            />
          </div>

          {/* Complete Submission Button */}
          <Button
            type="submit"
            disabled={submitting || isAvailable !== true}
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm h-10 shadow-sm transition-colors mt-2"
          >
            {submitting ? "Creating your workspace..." : "Finish Onboarding"}
          </Button>

        </form>
      </div>
    </main>
  );
}