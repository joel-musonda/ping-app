"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, sendEmailVerification } from "@/lib/auth";
import { databases, account, DATABASE_ID, PINGS_COLLECTION_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Check, AlertCircle, Camera, User } from "lucide-react";

export default function OnboardingPage() {
  const [user, setUser] = useState<any>(null);
  const [profileDoc, setProfileDoc] = useState<any>(null);
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  const [checkingVerification, setCheckingVerification] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleResendVerification = async () => {
    setResending(true);
    setResendStatus("");
    try {
      await sendEmailVerification();
      setResendStatus("Verification email sent — check your inbox.");
    } catch (err) {
      console.error("Failed to resend verification:", err);
      setResendStatus("Failed to send — please try again shortly.");
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    async function loadProfileState() {
      try {
        let activeUser = await getCurrentUser();
        if (!activeUser) {
          router.push("/login");
          return;
        }

        // Re-fetch user session if email verification state hasn't synced locally yet
        if (!activeUser.emailVerification) {
          try {
            const freshUser = await account.get();
            activeUser = freshUser;
          } catch {
            router.push("/login");
            return;
          }
        }

        setUser(activeUser);

        // Fetch user's profile if it exists in the database
        const res = await databases.listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [
          Query.equal("user_id", activeUser.$id),
        ]);

        if (res.documents.length > 0) {
          const doc = res.documents[0];
          setProfileDoc(doc);
          setHandle(doc.handle);
          setName(doc.name || "");
          setBio(doc.bio || "");
          setAvatarDataUrl(doc.avatar_url || "");

          // If already onboarded, redirect immediately
          if (doc.onboarded && activeUser.emailVerification) {
            router.push(`/${doc.handle}`);
            return;
          }
        } else {
          const starterHandle = activeUser.email
            ? activeUser.email.split("@")[0].replace(/[^a-z0-9_]/g, "")
            : "";
          setHandle(starterHandle);
        }
      } catch (err) {
        console.error("Error loading onboarding state:", err);
        router.push("/login");
      } finally {
        setCheckingVerification(false);
      }
    }
    loadProfileState();
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        canvas.width = MAX_WIDTH;
        canvas.height = MAX_HEIGHT;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, MAX_WIDTH, MAX_HEIGHT);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
        if (compressedBase64.length > 5000) {
          setUploadError("Image is too large. Please choose a simpler avatar icon.");
          return;
        }

        setAvatarDataUrl(compressedBase64);
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

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
    if (!user || !isAvailable || submitting) return;

    if (!user.emailVerification) {
      alert("Please verify your email address before finalizing your account.");
      return;
    }

    setSubmitting(true);
    const finalizedHandle = handle.toLowerCase().replace(/[^a-z0-9_]/g, "");

    try {
      if (profileDoc) {
        await databases.updateDocument(DATABASE_ID, PINGS_COLLECTION_ID, profileDoc.$id, {
          handle: finalizedHandle,
          name: name,
          bio: bio,
          avatar_url: avatarDataUrl,
          onboarded: true,
        });
      } else {
        await databases.createDocument(DATABASE_ID, PINGS_COLLECTION_ID, "unique()", {
          user_id: user.$id,
          handle: finalizedHandle,
          name: name,
          bio: bio,
          avatar_url: avatarDataUrl,
          onboarded: true,
        });
      }
      router.push(`/${finalizedHandle}`);
    } catch (err) {
      console.error("Failed to write onboarded user to Database:", err);
      setUploadError("Could not save your profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Skeleton Loader screen while loading configuration
  if (checkingVerification || !user) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm sm:max-w-md bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 sm:p-8 space-y-6 animate-pulse">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-24 h-24 rounded-full bg-neutral-200" />
            <div className="h-6 w-3/5 bg-neutral-200 rounded-md" />
            <div className="h-4 w-4/5 bg-neutral-100 rounded-md" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-3 w-1/4 bg-neutral-200 rounded-md" />
              <div className="h-9 w-full bg-neutral-100 rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-1/3 bg-neutral-200 rounded-md" />
              <div className="h-9 w-full bg-neutral-100 rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-1/4 bg-neutral-200 rounded-md" />
              <div className="h-24 w-full bg-neutral-100 rounded-lg" />
            </div>
            <div className="h-10 w-full bg-neutral-200 rounded-xl pt-2" />
          </div>
        </div>
      </main>
    );
  }

  // Email verification check screen
  if (!user.emailVerification) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xs sm:max-w-sm bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full bg-neutral-100 flex items-center justify-center">
            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-500" />
          </div>
          <h1 className="text-base sm:text-lg font-bold text-neutral-900">Verify your email</h1>
          <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
            We sent a verification link to{" "}
            <span className="font-medium text-neutral-900 break-all">{user.email}</span>. Click it to
            continue setting up your profile.
          </p>

          <Button
            onClick={handleResendVerification}
            disabled={resending}
            className="w-full bg-[#3892D0] hover:bg-[#2c7ab2] active:bg-[#236494] text-white font-medium text-xs sm:text-sm h-10 rounded-xl shadow-xs transition-colors mt-2"
          >
            {resending ? "Sending..." : "Resend verification email"}
          </Button>

          {resendStatus && <p className="text-xs text-neutral-400 pt-1 leading-snug">{resendStatus}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm sm:max-w-md bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 sm:p-8 space-y-6">

        <div className="flex flex-col items-center text-center">
          <div className="relative group cursor-pointer mb-3" onClick={triggerFileSelect}>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-neutral-100 border-2 border-dashed border-neutral-300 hover:border-neutral-900 flex items-center justify-center overflow-hidden transition relative shadow-inner">
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-neutral-400">
                  <User className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
              )}
              <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-200 ${
                avatarDataUrl 
                  ? "bg-black/40 opacity-0 group-hover:opacity-100" 
                  : "bg-neutral-900/5 hover:bg-neutral-900/10 opacity-100"
              }`}>
                <Camera className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110 ${avatarDataUrl ? 'text-white' : 'text-neutral-500'}`} />
                {!avatarDataUrl && (
                  <span className="text-[8px] sm:text-[9px] font-semibold tracking-wider uppercase mt-1 text-neutral-500">Upload</span>
                )}
              </div>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />

          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900">Set up your Ping</h1>
          <p className="text-xs text-neutral-500 mt-1">Provide an avatar and unique username to get started.</p>

          {uploadError && (
            <p className="text-red-500 text-[11px] font-medium bg-red-50 border border-red-100 p-2 rounded-md mt-2 max-w-xs">
              {uploadError}
            </p>
          )}
        </div>

        <form onSubmit={handleCompleteSetup} className="space-y-4">

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-neutral-700">Display Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Choongo Justine"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-neutral-200 bg-white focus-visible:ring-neutral-400 text-xs sm:text-sm h-9"
              required
            />
          </div>

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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-neutral-400 select-none">@</span>
              <Input
                id="handle"
                type="text"
                placeholder="username"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="pl-7 border-neutral-200 bg-white focus-visible:ring-neutral-400 text-xs sm:text-sm h-9"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs font-semibold text-neutral-700">Profile Bio</Label>
            <textarea
              id="bio"
              rows={4}
              placeholder="Tell us a little bit about yourself, what you're building, or your interests..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white p-2.5 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400 shadow-xs resize-none transition-all"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting || isAvailable !== true}
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs sm:text-sm h-10 shadow-xs transition-colors mt-2"
          >
            {submitting ? "Creating your workspace..." : "Finish Onboarding"}
          </Button>

        </form>
      </div>
    </main>
  );
}