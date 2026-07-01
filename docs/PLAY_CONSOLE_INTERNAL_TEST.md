# Google Play Internal Test Prep

This file is the Play Console entry checklist for the two FitNow Android apps.

## App 1: FitNow

- App name: FitNow
- Package name: `com.fitnow.app`
- Release bundle: `dist-apks/fitnow-release.aab`
- Version: `versionCode 2`, `versionName 1.0.1`
- App type: App
- Category: Shopping
- Distribution track: Internal testing first
- Privacy policy URL: `https://restshop7779.github.io/fitnow/privacy.html`

### Short Description

FitNow connects local fashion shopping, same-day reservations, store pickup flow, and delivery status tracking in one mobile app.

### Full Description

FitNow is a local fashion commerce app for browsing fashion items, reserving products, managing cart orders, and tracking delivery or pickup progress. Customers can use the shopping home, product details, cart, order status, and account screens from one app. Store partners can review incoming orders, manage preparation status, and handle return or refund requests through role-based access.

For the first Play Console release, publish this app to Internal testing only and use trusted testers to validate customer shopping, store order processing, delivery status, camera-based proof flow, and account transitions before a wider release.

### Internal Test Release Notes

Initial internal test build for FitNow customer and store workflows.

Test focus:
- Customer home, product detail, cart, and order flow
- Store order confirmation and pickup preparation
- Delivery tracking visibility
- Return/refund request visibility
- Login/logout and role switching behavior

## App 2: FitNow Rider

- App name: FitNow Rider
- Package name: `com.fitnow.rider`
- Release bundle: `dist-apks/fitnow-rider-release.aab`
- Version: `versionCode 1`, `versionName 0.1.0`
- App type: App
- Category: Business or Productivity
- Distribution track: Internal testing first
- Privacy policy URL: `https://restshop7779.github.io/fitnow/privacy.html`

### Short Description

FitNow Rider is the delivery partner app for viewing and handling FitNow delivery calls.

### Full Description

FitNow Rider is a separate delivery partner app for FitNow operations. It opens directly into the delivery-focused workflow and separates rider tasks from the customer and store app. Delivery partners can sign in to the delivery dashboard, review open delivery calls, claim assigned work, and support delivery proof workflows during internal testing.

For the first Play Console release, publish this app to Internal testing only and validate delivery login, open-call visibility, claim behavior, pickup and arrival proof steps, and role separation from the main FitNow app.

### Internal Test Release Notes

Initial internal test build for FitNow Rider delivery workflows.

Test focus:
- Rider app launch identity
- Delivery login
- Open-call visibility
- Delivery claim flow
- Pickup/arrival proof behavior
- Separation from customer/store app screens

## Required Play Console Setup

Create two separate Play Console apps:

1. `FitNow` with package `com.fitnow.app`.
2. `FitNow Rider` with package `com.fitnow.rider`.

For each app:

1. Create the app in Play Console.
2. Choose app type `App`.
3. Choose free or paid before publishing.
4. Complete Store listing basics.
5. Complete App content forms, including privacy policy and Data safety.
6. Go to Testing > Internal testing.
7. Create a tester email list.
8. Create a new internal test release.
9. Upload the matching `.aab` file.
10. Review and roll out to internal testing.

## Data Safety Draft

FitNow currently needs review before final declaration. Expected data categories to evaluate:

- Account/contact data: customer or partner identifiers, phone/contact info if collected.
- Purchase/order data: cart, reservation, order status, return/refund status.
- Photos: delivery proof photos through camera flow.
- App activity: role-based operational actions and delivery logs.
- Device permissions: camera and internet.

Do not submit the Data safety form until actual Supabase tables, storage buckets, auth providers, and retention rules are reviewed against the production configuration.

## Privacy Policy URL

Use this URL in Play Console:

```text
https://restshop7779.github.io/fitnow/privacy.html
```

The current public policy covers:

- Developer/contact information.
- What personal and sensitive data is collected.
- Why the data is used.
- Whether data is shared with vendors, delivery partners, Supabase, Kakao login, or payment providers.
- Data retention and deletion requests.
- Delivery proof photo retention.
- Security practices.

Before moving beyond internal testing, replace the contact placeholder with the final business/customer-support email shown in Play Console.

## Local Build Commands

```powershell
. .\.secrets\android-release-env.ps1
corepack pnpm run android:bundle
corepack pnpm run android:rider:bundle
```

The upload key and passwords remain local under `.secrets/` and must not be committed.
