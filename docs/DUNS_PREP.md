# D-U-N-S Number Prep

Use this before continuing Google Play Console organization account signup.

Official references:

- Google Play developer account required information: https://support.google.com/googleplay/android-developer/answer/13628312
- D&B D-U-N-S lookup: https://www.dnb.com/en-us/smb/duns/duns-lookup.html
- D&B D-U-N-S request: https://www.dnb.com/en-us/smb/duns/get-a-duns.html

## Current Signup Blocker

Google Play Console organization signup is asking for a D-U-N-S number.

Google uses the D-U-N-S number to verify the legal organization behind a Play Console organization account. If the organization does not already have one, Dun & Bradstreet says to request one through D&B. Google notes the process can take up to 30 days, so this should be handled before continuing the organization account path.

## Decide First

Use organization signup if FitNow will be operated under a registered business or company.

Use individual signup only if there is no registered business yet and the immediate goal is a faster internal-test upload. For FitNow's intended business model with customers, stores, riders, orders, returns, and settlement, organization signup is the better long-term path.

## Information To Prepare

Prepare these values exactly as they appear on business registration and official records:

| Field | Value |
| --- | --- |
| Legal organization name |  |
| Business registration number |  |
| Registered business address |  |
| Country/region | South Korea |
| Business phone number |  |
| Business website |  |
| Representative/contact name |  |
| Contact email |  |
| Contact phone number |  |
| Google Play developer email |  |
| Google Play developer phone |  |
| D-U-N-S number, if already known |  |

## Steps

1. Search D&B first to check whether the organization already has a D-U-N-S number.
2. If a matching organization appears, verify that the legal name and address match the business records.
3. If no matching organization appears, request a D-U-N-S number from D&B.
4. Wait for the D-U-N-S number email/confirmation.
5. Return to Google Play Console organization signup and enter the nine-digit D-U-N-S number.
6. Review the organization details shown by Google before continuing.

## What Must Match

The organization details connected to the D-U-N-S number should match the Google Play developer account details:

- Legal organization name.
- Registered address.
- Organization phone number.
- Organization website, if used.
- Contact details that can receive verification messages.

If the D-U-N-S record has an old address or old organization name, update it with D&B before using it in Google Play Console.

## Notes For FitNow

- Keep the account owner as the Google account that should permanently own the Play Console developer account.
- Do not enter a random D-U-N-S number. Google says correct-entry attempts are limited.
- Keep D-U-N-S, business registration, and Google Payments profile details consistent.
- After the developer account is created, continue with `docs/PLAY_CONSOLE_UPLOAD_RUNBOOK.md`.
