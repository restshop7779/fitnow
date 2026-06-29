# FitNow native packaging

FitNow now has Capacitor native shells for Android and iOS.

## Commands

```powershell
corepack pnpm run cap:sync
corepack pnpm run check:native
```

Android Studio:

```powershell
corepack pnpm run cap:android
```

Xcode on macOS:

```powershell
corepack pnpm run cap:ios
```

## Current app identity

- App ID: `com.fitnow.app`
- App name: `FitNow`
- Web assets: `dist`
- Orientation: portrait

## Native permissions

Android:

- `INTERNET`
- `CAMERA`

iOS:

- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSPhotoLibraryAddUsageDescription`

These are needed for delivery proof photos, review photos, and product images.

## Build requirement

Android APK/AAB builds require:

- JDK 17 or newer
- Android SDK with platform 36 and build tools installed
- Android Studio recommended

This Windows workspace did not have Android SDK installed. A portable JDK was prepared under `.tools`, but Android command line tools download did not complete due slow network. After Android Studio is installed, run:

```powershell
corepack pnpm run cap:sync
cd android
.\gradlew.bat assembleDebug
```

iOS builds require macOS with Xcode. The iOS project files are generated here, but final iPhone build/archive must be done on a Mac.
