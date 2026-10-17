# ArnisApp

Bare React Native 0.86 application in TypeScript. It uses React Native Firebase for email/password authentication and Cloud Firestore, without Expo or Expo Go.

## Firebase setup

1. Create a Firebase project and register the Android app with application ID `com.arnisnative` and the iOS app with the bundle ID shown in the Xcode target's **Signing & Capabilities** settings.
2. Download `google-services.json` to `android/app/google-services.json` and add `GoogleService-Info.plist` to the `ArnisNative` iOS target in Xcode, including it in **Copy Bundle Resources**.
3. In Firebase Console, enable **Authentication → Sign-in method → Email/Password** and create a **Cloud Firestore** database.
4. Publish the included `firestore.rules` to that Firebase project. With Firebase CLI installed and the project selected, run `firebase deploy --only firestore:rules`.

Native Firebase configuration is project-specific and is not included in this repository. The Android app can still build without `google-services.json` to preview the UI, but Firebase Auth/Firestore remain unavailable until the platform config files are added. Firebase Auth persists a signed-in session natively; reopening the app can restore that session offline. A fresh email/password sign-in or account creation requires internet. Firestore's native mobile cache is enabled by default and queues local writes while offline.

The teacher/student role is currently a profile label selected during account creation. Do not use that client-selected field as authorization for teacher-only data; use server-assigned custom claims or an admin-verified role before adding privileged operations.

## Run on Android

```bash
npm install
npm start
```

In a second terminal, with an emulator running or Android device connected with USB debugging:

```bash
npm run android
```

## Run on iOS

```bash
cd ios && pod install && cd ..
npm start
```

In another terminal:

```bash
npm run ios
```
# arnisapp
# arnisapp
