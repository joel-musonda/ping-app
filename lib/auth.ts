import {
  account,
  databases,
  DATABASE_ID,
  PINGS_COLLECTION_ID,
  getPingByUserId,
} from "@/lib/appwrite";
import { AppwriteException, ID, OAuthProvider, Permission, Role, type Models } from "appwrite";

const OAUTH_PENDING_KEY = "ping:oauth_pending";
const OAUTH_PENDING_TTL_MS = 10 * 60 * 1000;

export class AuthFlowError extends Error {
  constructor(public reason: "oauth_failed" | "oauth_state") {
    super(reason);
  }
}

async function clearCurrentSession() {
  try {
    await account.deleteSession({ sessionId: "current" });
  } catch {
    // No active session.
  }
}

export async function logOut() {
  try {
    await account.deleteSessions(); 
  
  } catch {
    try {
      await account.deleteSession("current");
    } catch {
      
    }
  }
}

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function sendEmailOtp(email: string): Promise<string> {
  const token = await account.createEmailToken({
    userId: ID.unique(),
    email: email.trim().toLowerCase(),
  });
  return token.userId;
}

export async function verifyEmailOtp(userId: string, code: string) {
  await clearCurrentSession();
  await account.createSession({ userId, secret: code.trim() });
}

export async function signInWithGoogle() {
  await clearCurrentSession();
  sessionStorage.setItem(OAUTH_PENDING_KEY, String(Date.now()));
  account.createOAuth2Token({
    provider: OAuthProvider.Google,
    success: `${window.location.origin}/auth/callback`,
    failure: `${window.location.origin}/login?error=oauth_failed`,
  });
}

// Only completes a callback that this browser started, so a crafted
// /auth/callback link cannot sign a visitor into someone else's account.
export async function completeOAuthSignIn(userId: string | null, secret: string | null) {
  const startedAt = Number(sessionStorage.getItem(OAUTH_PENDING_KEY));
  sessionStorage.removeItem(OAUTH_PENDING_KEY);

  if (!startedAt || Date.now() - startedAt > OAUTH_PENDING_TTL_MS) {
    throw new AuthFlowError("oauth_state");
  }
  if (!userId || !secret) {
    throw new AuthFlowError("oauth_failed");
  }

  await clearCurrentSession();
  await account.createSession({ userId, secret });
}

function starterHandle(user: Models.User<Models.Preferences>) {
  const fromEmail = (user.email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
  return fromEmail || `user_${user.$id.slice(0, 8).toLowerCase()}`;
}

// Profiles for new accounts use the account ID as the document ID, so
// concurrent sign-ins cannot create a second profile for the same user.
async function ensurePingProfile(user: Models.User<Models.Preferences>) {
  const existing = await getPingByUserId(user.$id);
  if (existing) return existing;

  const base = starterHandle(user);
  const candidates = [base, `${base}_${user.$id.slice(-4).toLowerCase()}`];

  for (const handle of candidates) {
    try {
      return await databases.createDocument(
        DATABASE_ID,
        PINGS_COLLECTION_ID,
        user.$id,
        { handle, bio: "", user_id: user.$id },
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ]
      );
    } catch (err) {
      if (!(err instanceof AppwriteException) || err.code !== 409) throw err;
      const created = await getPingByUserId(user.$id);
      if (created) return created;
    }
  }
  return null;
}

// Returning users (finished onboarding) go to their profile; everyone else to onboarding.
export async function getPostAuthDestination(user: Models.User<Models.Preferences>) {
  const profile = await ensurePingProfile(user);
  if (profile?.onboarded && profile.handle) return `/${profile.handle}`;
  return "/onboarding";
}

export function describeAuthError(err: unknown): string {
  if (err instanceof AuthFlowError) {
    return err.reason === "oauth_state"
      ? "That sign-in link has expired or was not started from this browser. Please try again."
      : "Google sign-in was cancelled or failed. Please try again.";
  }
  if (err instanceof AppwriteException) {
    if (err.code === 429) return "Too many attempts. Please wait a few minutes and try again.";
    if (err.type === "user_invalid_token" || err.type === "user_invalid_credentials") {
      return "That code is incorrect or has expired.";
    }
    if (err.type === "user_blocked") return "This account has been disabled.";
    if (err.type === "user_already_exists" || err.type === "user_email_already_exists") {
      return "This email is already linked to another sign-in method. Continue with email instead.";
    }
    if (err.type === "general_argument_invalid") return "Please enter a valid email address.";
    if (err.code === 402 || err.code >= 500) return "Ping is temporarily unavailable. Please try again later.";
  }
  return "Something went wrong. Please try again.";
}

export async function sendEmailVerification() {
  const redirectUrl = `${window.location.origin}/verify-email`;
  return await account.createVerification(redirectUrl);
}

export async function confirmEmailVerification(userId: string, secret: string) {
  return await account.updateVerification(userId, secret);
}
