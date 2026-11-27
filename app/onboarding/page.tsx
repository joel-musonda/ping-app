"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, sendEmailVerification } from "@/lib/auth";
import { databases, account, DATABASE_ID, PINGS_COLLECTION_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Check,
  AlertCircle,
  Camera,
  User,
  MapPin,
  Globe,
  Link,
  Save
} from "lucide-react";

// Top-level routes a handle would shadow at /<handle>.
const RESERVED_HANDLES = new Set([
  "analytics", "api", "auth", "community", "dashboard", "login", "signup", "forgot-password",
  "reset-password", "notebooks", "onboarding", "settings", "verify-email",
]);

export default function OnboardingPage() {
  const [user, setUser] = useState<any>(null);
  const [profileDoc, setProfileDoc] = useState<any>(null);
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [github, setGithub] = useState("");
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

        const res = await databases.listDocuments(DATABASE_ID, PINGS_COLLECTION_ID, [
          Query.equal("user_id", activeUser.$id),
        ]);

        if (res.documents.length > 0) {
          const doc = res.documents[0];
          setProfileDoc(doc);
          setHandle(doc.handle);
          setName(doc.name || "");
          setBio(doc.bio || "");
          setLocation(doc.location || "");
          setWebsite(doc.website || "");
          setTwitter(doc.twitter || "");
          setGithub(doc.github || "");
          setAvatarDataUrl(doc.avatar_url || "");

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

  // High-Quality Image Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Higher resolution (256x256) for crisp avatar rendering
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        canvas.width = MAX_WIDTH;
        canvas.height = MAX_HEIGHT;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, MAX_WIDTH, MAX_HEIGHT);

        // High quality JPEG output
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);

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

    if (RESERVED_HANDLES.has(cleanHandle)) {
      setIsAvailable(false);
      return;
    }

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

    const payload = {
      user_id: user.$id,
      handle: finalizedHandle,
      name,
      bio,
      location,
      website,
      twitter,
      github,
      avatar_url: avatarDataUrl,
      onboarded: true,
    };

    try {
      if (profileDoc) {
        await databases.updateDocument(
          DATABASE_ID,
          PINGS_COLLECTION_ID,
          profileDoc.$id,
          payload
        );
      } else {
        await databases.createDocument(
          DATABASE_ID,
          PINGS_COLLECTION_ID,
          user.$id,
          payload
        );
      }
      router.push(`/${finalizedHandle}`);
    } catch (err) {
      console.error("Failed to write onboarded user to Database:", err);
      setUploadError("Could not save your profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Skeleton Loader screen
  if (checkingVerification || !user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-neutral-100 via-neutral-100 to-neutral-200/80 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-white border border-neutral-200/80 shadow-md rounded-3xl p-6 sm:p-8 space-y-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-6 w-1/3 bg-neutral-200 rounded-lg" />
            <div className="h-4 w-1/2 bg-neutral-100 rounded-md" />
          </div>
          <div className="flex justify-center my-4">
            <div className="w-24 h-24 rounded-full bg-neutral-200" />
          </div>
          <div className="space-y-4">
            <div className="h-10 w-full bg-neutral-100 rounded-xl" />
            <div className="h-10 w-full bg-neutral-100 rounded-xl" />
            <div className="h-24 w-full bg-neutral-100 rounded-xl" />
            <div className="h-11 w-full bg-neutral-200 rounded-full" />
          </div>
        </div>
      </main>
    );
  }

  // Verification Screen
  if (!user.emailVerification) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-neutral-100 via-neutral-100 to-neutral-200/80 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm bg-white border border-neutral-200/80 shadow-md rounded-3xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-100 flex items-center justify-center border border-neutral-200/60">
            <Mail className="w-6 h-6 text-neutral-600" />
          </div>
          <h1 className="text-lg font-bold text-neutral-900">Verify your email</h1>
          <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
            We sent a verification link to{" "}
            <span className="font-semibold text-neutral-800 break-all">{user.email}</span>. Click it to continue setting up your profile.
          </p>

          <Button
            onClick={handleResendVerification}
            disabled={resending}
            className="w-full bg-[#0084FF] hover:bg-[#0073e6] active:bg-[#0062c4] text-white font-medium text-xs sm:text-sm h-11 rounded-full shadow-sm transition-all mt-2"
          >
            {resending ? "Sending..." : "Resend verification email"}
          </Button>

          {resendStatus && <p className="text-xs text-neutral-400 pt-1">{resendStatus}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-100 via-neutral-100 to-neutral-200/80 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl bg-white border border-neutral-200/80 shadow-md rounded-3xl p-6 sm:p-8 space-y-6">

        {/* Header section matching inspired UI */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">Profile Settings</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Upload your profile information and social connections.
          </p>
        </div>

        {/* Avatar Upload */}
        <div className="flex flex-col items-center justify-center pb-2">
          <div className="relative group cursor-pointer" onClick={triggerFileSelect}>
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-neutral-100 border-2 border-dashed border-neutral-300 hover:border-neutral-800 flex items-center justify-center overflow-hidden transition-all relative shadow-inner">
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-neutral-400">
                  <User className="w-9 h-9" />
                </div>
              )}
              <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-200 ${
                avatarDataUrl 
                  ? "bg-black/40 opacity-0 group-hover:opacity-100" 
                  : "bg-neutral-900/5 hover:bg-neutral-900/10 opacity-100"
              }`}>
                <Camera className={`w-6 h-6 transition-transform group-hover:scale-110 ${avatarDataUrl ? 'text-white' : 'text-neutral-500'}`} />
                {!avatarDataUrl && (
                  <span className="text-[9px] font-semibold tracking-wider uppercase mt-1 text-neutral-500">Upload</span>
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

          {uploadError && (
            <p className="text-red-500 text-xs font-medium bg-red-50 border border-red-100 p-2 rounded-lg mt-2 max-w-xs text-center">
              {uploadError}
            </p>
          )}
        </div>

        <form onSubmit={handleCompleteSetup} className="space-y-5">

          {/* Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-neutral-800">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-neutral-100/80 border-transparent focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 text-xs sm:text-sm h-11 rounded-2xl transition-all"
              required
            />
          </div>

          {/* Handle Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="handle" className="text-xs font-semibold text-neutral-800">
                Unique Username <span className="text-red-500">*</span>
              </Label>
              {isChecking && <span className="text-[10px] text-neutral-400 animate-pulse">Checking handle...</span>}
              {!isChecking && isAvailable === true && (
                <span className="text-[10px] text-green-600 flex items-center gap-0.5 font-semibold">
                  <Check className="w-3 h-3" /> Available
                </span>
              )}
              {!isChecking && isAvailable === false && (
                <span className="text-[10px] text-red-500 flex items-center gap-0.5 font-semibold">
                  <AlertCircle className="w-3 h-3" /> Taken or invalid
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-neutral-400 font-medium select-none">@</span>
              <Input
                id="handle"
                type="text"
                placeholder="username"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="pl-8 bg-neutral-100/80 border-transparent focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 text-xs sm:text-sm h-11 rounded-2xl transition-all"
                required
              />
            </div>
          </div>

          {/* Bio Field */}
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs font-semibold text-neutral-800">
              Bio <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="bio"
              rows={3}
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-2xl border border-transparent bg-neutral-100/80 p-3 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
              required
            />
            <p className="text-[11px] text-neutral-400">Brief summary for your profile card.</p>
          </div>

          {/* Location Field */}
          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-xs font-semibold text-neutral-800">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                id="location"
                type="text"
                placeholder="Kasama, Zambia"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10 bg-neutral-100/80 border-transparent focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 text-xs sm:text-sm h-11 rounded-2xl transition-all"
              />
            </div>
          </div>

          {/* Social Links Section */}
          <div className="pt-2 border-t border-neutral-100 space-y-3">
            <Label className="text-xs font-semibold text-neutral-800">Social Links</Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Website */}
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="pl-10 bg-neutral-100/80 border-transparent focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 text-xs sm:text-sm h-10 rounded-2xl transition-all"
                />
              </div>

              {/* Twitter */}
              <div className="relative">
                <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Twitter handle"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  className="pl-10 bg-neutral-100/80 border-transparent focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 text-xs sm:text-sm h-10 rounded-2xl transition-all"
                />
              </div>

              {/* GitHub */}
              <div className="relative sm:col-span-2">
                <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="GitHub username"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  className="pl-10 bg-neutral-100/80 border-transparent focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 text-xs sm:text-sm h-10 rounded-2xl transition-all"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons matching inspired UI */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              type="submit"
              disabled={submitting || isAvailable !== true}
              className="bg-[#0084FF] hover:bg-[#0073e6] active:bg-[#0062c4] text-white font-medium text-xs sm:text-sm h-11 px-6 rounded-full shadow-sm transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {submitting ? "Saving changes..." : "Finish Onboarding"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="bg-neutral-200/70 hover:bg-neutral-200 text-neutral-800 font-medium text-xs sm:text-sm h-11 px-6 rounded-full transition-all"
            >
              Cancel
            </Button>
          </div>

        </form>
      </div>
    </main>
  );
}