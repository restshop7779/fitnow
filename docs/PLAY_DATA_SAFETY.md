# Google Play Data Safety Draft

This draft is for Play Console > Policy > App content > Data safety.

Official reminders:

- Google requires developers to disclose collection, sharing, and security practices in Play Console for apps published on Google Play.
- The declaration must include third-party SDKs and service providers used by the app.
- If the app allows account creation, prepare account and data deletion answers and a deletion request URL.

## Shared URLs

- Privacy policy: `https://restshop7779.github.io/fitnow/privacy.html`
- Account/data deletion: `https://restshop7779.github.io/fitnow/data-deletion.html`

## Main App: FitNow

- Package: `com.fitnow.app`
- Data encrypted in transit: Yes. Use HTTPS/Supabase/TLS for production.
- Users can request data deletion: Yes.
- Account creation supported: Yes, through phone-style test login and planned Kakao/Supabase auth.

### Data Types To Declare

| Google Play category | Data type | Collected | Shared | Required | Purpose |
| --- | --- | --- | --- | --- | --- |
| Personal info | Name | Yes | Yes, with stores/delivery partners as needed | Required for orders | Account management, order processing, delivery |
| Personal info | Phone number | Yes | Yes, with stores/delivery partners as needed | Required for orders | Account management, order contact, delivery |
| Personal info | Email address | Yes, when social login provides it | Yes, with auth provider/Supabase | Optional depending on login | Authentication, account recovery |
| Financial info | Purchase history | Yes | Yes, with stores/payment providers as needed | Required for orders | Order, payment, refund, settlement support |
| Photos and videos | Photos | Yes, delivery proof photos | Yes, visible to customer/store/admin/delivery roles as needed | Required for proof flow | Pickup/arrival proof and dispute handling |
| App activity | App interactions | Yes | Yes, with Supabase as service provider | Required for service operation | Wishlist, order status, role actions, delivery logs |
| App info and performance | Crash logs or diagnostics | Limited/planned | Shared with infrastructure providers if enabled | Optional | Stability and debugging |
| Device or other IDs | User/account IDs | Yes | Yes, with Supabase/auth provider | Required | Authentication and data linkage |

### Sharing Notes

Declare sharing where data is made available to:

- Supabase for database, auth, and storage infrastructure.
- Kakao/Supabase auth for login identity.
- Payment provider when payment is connected.
- Stores for order preparation, return/refund handling, and settlement.
- Delivery partners for open calls, assignment, pickup, arrival, and proof photos.

## Rider App: FitNow Rider

- Package: `com.fitnow.rider`
- Data encrypted in transit: Yes. Use HTTPS/Supabase/TLS for production.
- Users can request data deletion: Yes.
- Account creation supported: Delivery partner accounts are operated by admin-created credentials.

### Data Types To Declare

| Google Play category | Data type | Collected | Shared | Required | Purpose |
| --- | --- | --- | --- | --- | --- |
| Personal info | Name or nickname | Yes | Yes, with admin/store/customer-visible delivery status as needed | Required | Rider account and assignment display |
| Personal info | Phone number or account contact | Possible, depending on production account setup | Yes, with operator/admin as needed | Required if used for login/contact | Delivery partner account operation |
| Photos and videos | Photos | Yes, pickup/arrival proof photos | Yes, with customer/store/admin roles as needed | Required for proof flow | Delivery proof and dispute handling |
| App activity | App interactions | Yes | Yes, with Supabase as service provider | Required | Open-call claim, pickup, arrival, delivery logs |
| Device or other IDs | User/account IDs | Yes | Yes, with Supabase/auth provider | Required | Authentication and assignment linkage |

## Security Answers

Use these only if production configuration matches them:

- Data encrypted in transit: Yes.
- Users can request data deletion: Yes.
- Independent security review: No, unless an external review is completed.
- Data collection is optional: No for order/delivery essentials. Optional for social login fields and diagnostics where applicable.

## Before Submitting

Confirm these against production Supabase and provider settings:

- Storage bucket access for delivery proof photos.
- Retention policy for delivery proof photos, currently planned as 30 days after delivery completion.
- Whether payment provider SDK/API collects additional identifiers, financial info, or device data.
- Whether Kakao login returns email, profile image, or other profile fields.
- Whether analytics, crash reporting, push notifications, or advertising SDKs are added later.
- Final customer-support email and account deletion request handling process.
