import { account, databases, DATABASE_ID, PINGS_COLLECTION_ID } from "@/lib/appwrite";
import { ID } from "appwrite";
import { OAuthProvider } from "appwrite";


async function createPingProfile(userId: string, handle: string) {
  return await databases.createDocument(
    DATABASE_ID,
    PINGS_COLLECTION_ID,
    ID.unique(),
    {
      handle,
      bio: "",
      avatar_url: "",
      user_id: userId,
    }
  );
}

export async function signUp(email: string, password: string) {
  try {
    await account.deleteSession("current");
  } catch {
    // no active session, that's fine
  }

  const user = await account.create(ID.unique(), email, password);
  await account.createEmailPasswordSession(email, password);

  const starterHandle = email.split("@")[0];
  await createPingProfile(user.$id, starterHandle);

  return starterHandle;
}

export async function logIn(email: string, password: string) {
  await account.createEmailPasswordSession(email, password);
}

export async function logOut() {
  await account.deleteSession("current");
}

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null; // not logged in
  }
}

export function signInWithGoogle() {
  account.createOAuth2Session(
    OAuthProvider.Google,
    `${window.location.origin}/auth/callback`,
    `${window.location.origin}/login`
  );
}

export function signInWithGithub() {
  account.createOAuth2Session(
    OAuthProvider.Github,
    `${window.location.origin}/auth/callback`,
    `${window.location.origin}/login`
  );
}

// 1. Sends the password recovery link to the user's inbox
export async function sendPasswordRecovery(email: string) {
  // Replace the URL with your actual local or production domain path
  const redirectUrl = "http://localhost:3000/reset-password";
  return await account.createRecovery(email, redirectUrl);
}

// 2. Submits the new password using tokens extracted from the URL query strings
export async function confirmPasswordRecovery(userId: string, secret: string, password: string) {
  return await account.updateRecovery(userId, secret, password);
}