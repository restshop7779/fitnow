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

Android debug APK:

```powershell
corepack pnpm run android:debug
```

Android release bundle:

```powershell
corepack pnpm run android:bundle
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

- JDK 21 or newer
- Android SDK with platform 36 and build tools installed
- Android Studio recommended

This Windows workspace now has portable local build tools under `.tools`:

- `.tools/jdk-21`
- `.tools/android-sdk`

The verified debug APK path is:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

The verified release bundle path is:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

To rebuild it:

```powershell
corepack pnpm run android:debug
corepack pnpm run android:bundle
```

iOS builds require macOS with Xcode. The iOS project files are generated here, but final iPhone build/archive must be done on a Mac.

Before Play Console upload, configure the real upload signing key and keep the keystore outside Git. The current release bundle confirms that the Android release build pipeline works, but store submission should use the final upload key and version code.

## Install on a connected Galaxy device

Enable developer options and USB debugging on the phone, connect it by USB, then run:

```powershell
.\.tools\android-sdk\platform-tools\adb.exe devices
.\.tools\android-sdk\platform-tools\adb.exe install -r .\android\app\build\outputs\apk\debug\app-debug.apk
```
