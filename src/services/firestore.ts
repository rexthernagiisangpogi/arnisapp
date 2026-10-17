import type { User, UserRole } from "../features/auth/types";
import { requireFirebaseRuntime, requireFirestore } from "./firebase";

export type UserProfileData = { name: string; email: string; role: UserRole };
const userDocument = (uid: string) =>
  requireFirebaseRuntime().firestoreApi.doc(requireFirestore(), "users", uid);

export async function getUserProfile(
  uid: string,
): Promise<UserProfileData | null> {
  const snapshot = await requireFirebaseRuntime().firestoreApi.getDoc(
    userDocument(uid),
  );
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    name: typeof data.name === "string" ? data.name : "",
    email: typeof data.email === "string" ? data.email : "",
    role: data.role === "teacher" ? "teacher" : "student",
  };
}

export async function createUserProfile(user: User): Promise<void> {
  const firestoreApi = requireFirebaseRuntime().firestoreApi;
  await firestoreApi.setDoc(userDocument(user.id), {
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: firestoreApi.serverTimestamp(),
    updatedAt: firestoreApi.serverTimestamp(),
  });
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Omit<UserProfileData, "role">>,
): Promise<void> {
  const firestoreApi = requireFirebaseRuntime().firestoreApi;
  await firestoreApi.setDoc(
    userDocument(uid),
    { ...updates, updatedAt: firestoreApi.serverTimestamp() },
    { merge: true },
  );
}
