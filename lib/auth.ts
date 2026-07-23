import { account } from "@/lib/appwrite"; 
import { ID, OAuthProvider } from "appwrite";

export async function signUp(email: string, password: string) {
  try {
    await account.deleteSession("current");
  } catch {

  }

  // 1. Create the Appwrite Auth user
  const user = await account.create(ID.unique(), email, password);
  

  await account.createEmailPasswordSession(email, password);


  
  return user;
}

export async function logIn(email: string, password: string) {
  try {
    await account.deleteSession("current");
  } catch {
    
  }
  await account.createEmailPasswordSession(email, password);
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

export async function signInWithGoogle() {
  try {
    await account.deleteSession("current");
  } catch {
    
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

export async function sendEmailVerification() {
  const redirectUrl = `${window.location.origin}/verify-email`;
  return await account.createVerification(redirectUrl);
}

export async function confirmEmailVerification(userId: string, secret: string) {
  return await account.updateVerification(userId, secret);
}