import type { User as FirebaseUser } from "@react-native-firebase/auth";
import {
  firebaseAuth,
  requireFirebaseAuth,
  requireFirebaseRuntime,
} from "../../../services/firebase";
import { createUserProfile, getUserProfile } from "../../../services/firestore";
import type { LoginCredentials, User } from "../types";

export type SignUpCredentials = LoginCredentials & { name: string };

export function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Choose a stronger password with at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email or password is incorrect.";
    case "auth/network-request-failed":
      return "You are offline. Sign in after reconnecting, or reopen the app if you signed in before.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a little and try again.";
    case "auth/operation-not-allowed":
      return "Email and password sign-in is not enabled for this Firebase project.";
    case "auth/native-module-unavailable":
      return "Rebuild the app after adding its Firebase configuration to enable sign-in.";
    default:
      return "We could not complete that request. Please try again.";
  }
}

function toProfile(
  authUser: FirebaseUser,
  profile: Awaited<ReturnType<typeof getUserProfile>>,
): User {
  return {
    id: authUser.uid,
    name: profile?.name || authUser.displayName || "Arnis member",
    email: profile?.email || authUser.email || "",
    role: profile?.role ?? "student",
  };
}

async function toSession(authUser: FirebaseUser) {
  let profile: Awaited<ReturnType<typeof getUserProfile>> = null;
  try {
    profile = await getUserProfile(authUser.uid);
  } catch {}
  return {
    token: await authUser.getIdToken(),
    user: toProfile(authUser, profile),
  };
}

export async function signUp(credentials: SignUpCredentials) {
  const authApi = requireFirebaseRuntime().authApi;
  const result = await authApi.createUserWithEmailAndPassword(
    requireFirebaseAuth(),
    credentials.email.trim(),
    credentials.password,
  );
  await authApi.updateProfile(result.user, {
    displayName: credentials.name.trim(),
  });
  const user: User = {
    id: result.user.uid,
    name: credentials.name.trim(),
    email: result.user.email ?? credentials.email.trim(),
    role: credentials.role,
  };
  await createUserProfile(user);
  return { token: await result.user.getIdToken(), user };
}

export async function login(credentials: LoginCredentials) {
  const result =
    await requireFirebaseRuntime().authApi.signInWithEmailAndPassword(
      requireFirebaseAuth(),
      credentials.email.trim(),
      credentials.password,
    );
  return toSession(result.user);
}

export function observeAuthState(
  listener: (user: FirebaseUser | null) => void,
) {
  if (!firebaseAuth) {
    listener(null);
    return () => {};
  }
  return requireFirebaseRuntime().authApi.onAuthStateChanged(
    requireFirebaseAuth(),
    listener,
  );
}

export const sendPasswordReset = (email: string) =>
  requireFirebaseRuntime().authApi.sendPasswordResetEmail(
    requireFirebaseAuth(),
    email.trim(),
  );

export const logout = () =>
  requireFirebaseRuntime().authApi.signOut(requireFirebaseAuth());

export function getFallbackProfile(authUser: FirebaseUser): User {
  return toProfile(authUser, null);
}
