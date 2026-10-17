import {
    requireFirebaseRuntime,
    requireFirestore,
} from "../../../services/firebase";
import type { UserRole } from "../../auth/types";
import { claimStudentRoster } from "../../students/services/studentsService";
import type { Profile, ProfileInput } from "../types";

function profileDocument(uid: string) {
  return requireFirebaseRuntime().firestoreApi.doc(
    requireFirestore(),
    "profiles",
    uid,
  );
}

export async function getProfile(uid: string): Promise<Profile | null> {
  try {
    const firestoreApi = requireFirebaseRuntime().firestoreApi;
    const db = requireFirestore();
    const snapshot = await firestoreApi.getDoc(profileDocument(uid));

    if (snapshot.exists()) {
      const data = snapshot.data();
      const fullName =
        (typeof data.full_name === "string" && data.full_name) ||
        (typeof data.name === "string" && data.name) ||
        "";
      const role =
        data.role === "teacher" || data.role === "student"
          ? (data.role as UserRole)
          : "student";

      return {
        user_id: uid,
        role,
        full_name: fullName || "Arnis member",
        grade: typeof data.grade === "string" ? data.grade : "",
        section: typeof data.section === "string" ? data.section : "",
        created_at: data.created_at ?? new Date(),
      };
    }

    // Fallback: check users collection if profile document hasn't been created yet
    try {
      const userDoc = firestoreApi.doc(db, "users", uid);
      const userSnapshot = await firestoreApi.getDoc(userDoc);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const role =
          userData.role === "teacher" || userData.role === "student"
            ? (userData.role as UserRole)
            : "student";
        const fullName =
          (typeof userData.name === "string" && userData.name) ||
          (typeof userData.full_name === "string" && userData.full_name) ||
          "";

        return {
          user_id: uid,
          role,
          full_name: fullName || "Arnis member",
          grade: typeof userData.grade === "string" ? userData.grade : "",
          section: typeof userData.section === "string" ? userData.section : "",
          created_at: userData.createdAt ?? new Date(),
        };
      }
    } catch {
      // Fallback check failed; continue to return null
    }

    return null;
  } catch (cause) {
    console.warn("getProfile load warning:", cause);
    return null;
  }
}

export async function createProfile(
  uid: string,
  input: ProfileInput,
  email: string,
): Promise<Profile> {
  const firestoreApi = requireFirebaseRuntime().firestoreApi;
  const db = requireFirestore();
  const profile: Profile = {
    user_id: uid,
    role: input.role,
    full_name: input.full_name.trim(),
    grade: input.role === "student" ? input.grade.trim() : "",
    section: input.role === "student" ? input.section.trim() : "",
    created_at: firestoreApi.serverTimestamp(),
  };

  try {
    await firestoreApi.setDoc(profileDocument(uid), profile);
  } catch (cause) {
    console.warn("createProfile write to profiles warning:", cause);
  }

  // Also sync to users collection if possible
  try {
    await firestoreApi.setDoc(
      firestoreApi.doc(db, "users", uid),
      {
        name: profile.full_name,
        role: profile.role,
        updatedAt: firestoreApi.serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    // Non-fatal sync
  }

  if (input.role === "student") {
    try {
      await claimStudentRoster(uid, email);
    } catch {
      // Profile creation can complete while roster linking waits for connectivity.
    }
  }
  return profile;
}

export async function updateProfile(
  uid: string,
  input: Pick<ProfileInput, "full_name" | "grade" | "section">,
): Promise<void> {
  const firestoreApi = requireFirebaseRuntime().firestoreApi;
  await firestoreApi.setDoc(
    profileDocument(uid),
    {
      full_name: input.full_name.trim(),
      grade: input.grade.trim(),
      section: input.section.trim(),
    },
    { merge: true },
  );
}
