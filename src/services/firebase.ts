type AppApi = typeof import("@react-native-firebase/app");
type AuthApi = typeof import("@react-native-firebase/auth");
type FirestoreApi = typeof import("@react-native-firebase/firestore");

const runtime = (() => {
  try {
    const appApi = require("@react-native-firebase/app") as AppApi;
    const authApi = require("@react-native-firebase/auth") as AuthApi;
    const firestoreApi =
      require("@react-native-firebase/firestore") as FirestoreApi;
    const app = appApi.getApp();
    return {
      app,
      authApi,
      auth: authApi.getAuth(app),
      firestoreApi,
      firestore: firestoreApi.getFirestore(app),
    };
  } catch {
    return null;
  }
})();

export const firebaseApp = runtime?.app ?? null;
export const firebaseAuth = runtime?.auth ?? null;
export const firestore = runtime?.firestore ?? null;

export function requireFirebaseAuth() {
  return requireFirebaseRuntime().auth;
}

export function requireFirestore() {
  return requireFirebaseRuntime().firestore;
}

export function requireFirebaseRuntime() {
  if (!runtime) {
    throw Object.assign(
      new Error(
        "Firebase native modules are missing. Add the Firebase app config and rebuild the native app.",
      ),
      { code: "auth/native-module-unavailable" },
    );
  }
  return runtime;
}
