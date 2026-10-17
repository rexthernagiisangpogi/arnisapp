import { firebaseApp, requireFirebaseRuntime } from "./firebase";

type StorageApi = typeof import("@react-native-firebase/storage");

export async function uploadLocalImage(
  path: string,
  localUri: string,
): Promise<string> {
  if (!firebaseApp) {
    throw Object.assign(
      new Error("Firebase Storage is not available in this build."),
      {
        code: "storage/native-module-unavailable",
      },
    );
  }
  const storageApi = require("@react-native-firebase/storage") as StorageApi;
  const storage = storageApi.getStorage(requireFirebaseRuntime().app);
  const storageRef = storageApi.ref(storage, path);
  const localPath = localUri.replace(/^file:\/\//, "");
  await storageApi.putFile(storageRef, localPath, {
    contentType: "image/jpeg",
  });
  const downloadUrl: unknown = await storageApi.getDownloadURL(storageRef);
  if (typeof downloadUrl !== "string") {
    throw new Error("Storage did not return an image URL.");
  }
  return downloadUrl;
}
