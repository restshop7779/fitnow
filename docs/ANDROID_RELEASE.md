# Android Release Builds

FitNow uses two Android package identities:

- Main app: `com.fitnow.app`, output `dist-apks/fitnow-release.aab`
- Rider app: `com.fitnow.rider`, output `dist-apks/fitnow-rider-release.aab`

## Build Commands

```powershell
corepack pnpm run android:bundle
corepack pnpm run android:rider:bundle
```

## Upload-Key Signing

Release signing is injected from environment variables. Do not commit keystores or passwords.

```powershell
$env:FITNOW_ANDROID_KEYSTORE="C:\secure\fitnow-upload.jks"
$env:FITNOW_ANDROID_KEYSTORE_PASSWORD="..."
$env:FITNOW_ANDROID_KEY_ALIAS="fitnow-upload"
$env:FITNOW_ANDROID_KEY_PASSWORD="..."
```

If these variables are not set, the scripts still build local release bundles, but they are not ready for store upload.

## Version Policy

- Main app starts at `versionCode 2`, `versionName 1.0.1`.
- Rider app starts at `versionCode 1`, `versionName 0.1.0`.
- Increase each app's `versionCode` independently before uploading a new release for that package.
