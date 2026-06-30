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

Generate a local upload keystore once:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/create-android-upload-keystore.ps1
```

This creates local-only files under `.secrets/`:

- `.secrets/fitnow-upload.jks`
- `.secrets/android-release-env.ps1`
- `.secrets/README.txt`

Load the signing environment before store-ready builds:

```powershell
. .\.secrets\android-release-env.ps1
corepack pnpm run android:bundle
corepack pnpm run android:rider:bundle
corepack pnpm run check:release-bundles
```

If these variables are not set, the scripts still build local release bundles, but they are not ready for store upload.

Back up `.secrets/fitnow-upload.jks` and `.secrets/android-release-env.ps1` to a secure password manager or encrypted drive before publishing. Losing the upload key can block future store updates.

## Version Policy

- Main app starts at `versionCode 2`, `versionName 1.0.1`.
- Rider app starts at `versionCode 1`, `versionName 0.1.0`.
- Increase each app's `versionCode` independently before uploading a new release for that package.
