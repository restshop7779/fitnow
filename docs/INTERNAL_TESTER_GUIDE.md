# Internal Tester Guide

Send this to trusted testers after the Play Console internal testing links are available.

## Install

1. Open the internal testing opt-in link for FitNow.
2. Join the test.
3. Install FitNow from Google Play.
4. If testing delivery workflows, open the FitNow Rider opt-in link and install FitNow Rider too.

## FitNow Customer Test

1. Open FitNow.
2. Check that the home screen loads product cards.
3. Open a product detail page.
4. Add an item to the cart.
5. Open the cart and check quantity, total price, and free delivery text.
6. Complete a reservation order using test customer information.
7. Open the order tracking screen and confirm the order status is visible.
8. Open My Page and confirm privacy policy and data deletion links open correctly.

Report:

- Any button that does not respond.
- Any screen where text overlaps or is hidden behind bottom navigation.
- Any order that disappears after refresh.
- Any login/logout issue.

## Store/Vendor Test

1. Enter the management screen.
2. Log in with the provided store/vendor test access.
3. Confirm incoming orders are visible.
4. Open an order detail.
5. Move the order through inventory check and pickup preparation.
6. Check return/refund request visibility if test data is available.

Report:

- Orders not visible to the expected store.
- Buttons that are hard to read or hard to tap.
- Status labels that repeat or conflict.

## Rider Test

1. Open FitNow Rider.
2. Log in with the provided delivery partner test access.
3. Confirm open delivery calls are visible.
4. Claim or assign a delivery.
5. Check pickup proof and arrival proof flow.
6. Complete delivery when available.

Report:

- Open calls not appearing after a store marks pickup ready.
- Camera/photo proof flow failures.
- Delivery status not updating for the customer.
- Any role leakage from customer/store/admin screens.

## Tester Feedback Format

Ask testers to send feedback in this format:

```text
Phone model:
Android version:
App tested: FitNow / FitNow Rider
Screen:
What happened:
What I expected:
Screenshot or screen recording:
```

## Current Test Focus

- App install and launch.
- Bottom tab responsiveness.
- Cart and order reservation.
- Store order processing.
- Rider open-call visibility.
- Delivery proof photo flow.
- Return/refund visibility.
- Privacy policy and data deletion links.
