# Play Console Upload Runbook

Use this runbook when creating the first internal test releases for FitNow and FitNow Rider.

Official references:

- Internal testing: https://support.google.com/googleplay/android-developer/answer/9845334
- Prepare app for review: https://support.google.com/googleplay/android-developer/answer/9859455
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Account deletion/user data: https://support.google.com/googleplay/android-developer/answer/10144311

## Upload Files

| App | Package | Upload file | Version |
| --- | --- | --- | --- |
| FitNow | `com.fitnow.app` | `dist-apks/fitnow-release.aab` | `1.0.1`, versionCode `2` |
| FitNow Rider | `com.fitnow.rider` | `dist-apks/fitnow-rider-release.aab` | `0.1.0`, versionCode `1` |

Both bundles must be built after loading `.secrets/android-release-env.ps1` so the upload key is applied.

## Shared URLs

- Privacy policy: `https://restshop7779.github.io/fitnow/privacy.html`
- Account/data deletion: `https://restshop7779.github.io/fitnow/data-deletion.html`

## App Creation

Create two separate Play Console apps.

If creating an organization account first, prepare the D-U-N-S number using `docs/DUNS_PREP.md` before continuing. Google Play Console organization signup will not proceed without a valid D-U-N-S number unless Google approves an alternative verification route.

### FitNow

- App name: `FitNow`
- Default language: Korean or English, depending on the store listing target.
- App or game: App.
- Free or paid: Free for internal testing.
- Category: Shopping.
- Package after AAB upload: `com.fitnow.app`.

### FitNow Rider

- App name: `FitNow Rider`
- Default language: Korean or English, depending on the store listing target.
- App or game: App.
- Free or paid: Free for internal testing.
- Category: Business or Productivity.
- Package after AAB upload: `com.fitnow.rider`.

## App Content Answers

Apply these to both apps unless noted.

- Privacy policy: use the shared privacy policy URL.
- Account deletion URL: use the shared account/data deletion URL.
- Ads: No, unless an ad SDK or ad placement is added later.
- App access/sign-in details: Required. Provide tester login instructions and any admin/vendor/rider PINs needed for review.
- Target audience: Adults/general shopping users. Do not target children.
- News app: No.
- COVID-19 contact tracing/status app: No.
- Government app: No.
- Financial features: No consumer finance features at this stage. Payment/order records are commerce records, not lending/finance products.
- Health features: No.
- Data safety: fill from `docs/PLAY_DATA_SAFETY.md`.

## Internal Testing Steps

Repeat once for FitNow and once for FitNow Rider.

1. Open Play Console and select the app.
2. Complete required Store presence basics enough for internal testing.
3. Go to Policy and programs > App content and complete required forms.
4. Go to Testing > Internal testing.
5. Create or select the internal tester email list.
6. Create a new release.
7. Upload the matching `.aab` file.
8. Add release notes from `docs/PLAY_CONSOLE_INTERNAL_TEST.md`.
9. Review warnings. Do not roll out if package name, versionCode, signing, or app-content warnings are unresolved.
10. Roll out to internal testing.
11. Copy the tester opt-in link and send it to testers.

## Reviewer/Test Login Notes

Prepare these before sending for review:

- Customer test login path.
- Store/vendor test account or role switching instructions.
- Rider app login PIN or delivery partner account instructions.
- Admin-only features that are not available to normal users.
- A short test scenario: add item to cart, reserve order, store confirms pickup preparation, rider claims delivery, delivery proof flow, return/refund visibility.

## Local Verification Commands

Run before uploading a new build:

```powershell
. .\.secrets\android-release-env.ps1
corepack pnpm run android:bundle
corepack pnpm run android:rider:bundle
corepack pnpm run check:release-bundles
.\.tools\jdk-21\bin\jarsigner.exe -verify -verbose -certs dist-apks\fitnow-release.aab
.\.tools\jdk-21\bin\jarsigner.exe -verify -verbose -certs dist-apks\fitnow-rider-release.aab
```

Expected result:

- `check:release-bundles` passes.
- `jarsigner` prints `jar verified` for both bundles.

## Stop Conditions

Stop and fix before rollout if any of these happen:

- Play Console says the package name does not match the intended app.
- Play Console says the versionCode was already used.
- AAB upload fails signing validation.
- Privacy policy URL or data deletion URL is unreachable.
- Data safety answers do not match the app behavior or SDKs.
- Reviewer cannot access login-protected features.
