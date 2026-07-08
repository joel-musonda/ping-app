import { account, databases, DATABASE_ID, PINGS_COLLECTION_ID, createPingProfile } from "@/lib/appwrite";
import { ID, OAuthProvider } from "appwrite";

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
  try {
    await account.deleteSession("current");
  } catch {
    // no active session, that's fine
  }
  await account.createEmailPasswordSession(email, password);
}

export async function logOut() {
  try {
    await account.deleteSessions(); // clears ALL sessions for this account, not just the current one
  } catch {
    try {
      await account.deleteSession("current");
    } catch {
      // already logged out, nothing to do
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

export async function signInWithGoogle() {
  try {
    await account.deleteSession("current");
  } catch {
    // no active session, that's fine
  }
  account.createOAuth2Session(
    OAuthProvider.Google,
    `${window.location.origin}/auth/callback`,
    `${window.location.origin}/login`
  );
}

export async function signInWithGithub() {
  try {
    await account.deleteSession("current");
  } catch {
    // no active session, that's fine
  }
  account.createOAuth2Session(
    OAuthProvider.Github,
    `${window.location.origin}/auth/callback`,
    `${window.location.origin}/login`
  );
}

export async function sendPasswordRecovery(email: string) {
  const redirectUrl = `${window.location.origin}/reset-password`;
  return await account.createRecovery(email, redirectUrl);
}

export async function confirmPasswordRecovery(userId: string, secret: string, password: string) {
  return await account.updateRecovery(userId, secret, password);
}