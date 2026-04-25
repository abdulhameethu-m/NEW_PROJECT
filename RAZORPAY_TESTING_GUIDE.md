# Razorpay Testing Guide

This document explains how to test the online payment flow for this project using Razorpay Test Mode.

Project stack:

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB

Target flow:

`User -> Checkout -> Razorpay Test Payment -> Verify -> Order Created -> Refund/Payout checks`

## 1. Goal

Use Razorpay Test Mode to confirm that:

1. Online checkout opens Razorpay correctly.
2. Successful payments create orders and mark payment status correctly.
3. Failed payments do not create false paid orders.
4. Webhooks are received and processed.
5. Refund flow works from admin finance screens.
6. Payout records are created and can be tested in RazorpayX Test Mode.

## 2. Razorpay Dashboard Setup

Use Razorpay Test Mode, not Live Mode.

In the Razorpay dashboard:

1. Switch to `Test Mode`.
2. Generate or copy your test API keys.
3. Create a webhook in Test Mode.
4. If you want to test payouts too, use RazorpayX Test Mode and add dummy balance.

Official references:

- Razorpay test cards: https://razorpay.com/docs/payments/payments/test-card-details/?preferred-country=IN
- Razorpay test UPI IDs: https://razorpay.com/docs/payments/payments/test-upi-details/?preferred-country=IN
- Webhook validation and testing: https://razorpay.com/docs/webhooks/validate-test/
- RazorpayX test mode: https://razorpay.com/docs/x/dashboard/test-mode/

## 3. Environment Variables

Update [backend/.env](D:/GRM/PROJ/backend/.env) with Razorpay test values:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_test_webhook_secret
RAZORPAY_PAYOUT_SOURCE_ACCOUNT=your_test_payout_source_account
PAYOUT_DELAY_DAYS=7
```

Notes:

- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` must both be from Test Mode.
- `RAZORPAY_WEBHOOK_SECRET` must exactly match the secret configured for the webhook in the Razorpay dashboard.
- `RAZORPAY_PAYOUT_SOURCE_ACCOUNT` is only needed for payout testing.

## 4. Run the App Locally

Open two terminals.

Backend:

```powershell
cd D:\GRM\PROJ\backend
npm run dev
```

Frontend:

```powershell
cd D:\GRM\PROJ\frontend
npm run dev
```

Expected local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## 5. Prepare Test Data

Before testing payment:

1. Make sure MongoDB is running.
2. Make sure at least one product is approved and visible in the storefront.
3. Create a user account and log in.
4. Add a product to cart.
5. Make sure the user has a valid delivery address.

## 6. Basic Online Payment Test

### Checkout path

1. Open the storefront.
2. Add a product to cart.
3. Go to `/checkout`.
4. Select `Razorpay`.
5. Click `Continue to Razorpay`.

Your app should:

1. Call `POST /api/payments/create-order`
2. Open the Razorpay popup
3. On success, call `POST /api/payments/verify`
4. Redirect to `/checkout/success`

## 7. Test Payment Methods

### Option A: Test UPI

From Razorpay's official test UPI docs:

- Success UPI ID: `success@razorpay`
- Failure UPI ID: `failure@razorpay`

Use this when Razorpay checkout asks for UPI.

Important:

- In Razorpay Test Mode, UPI cancellation is not reliable for failure simulation. Use the failure UPI ID or card test flow for clearer negative-path testing.

### Option B: Test Card

Use Razorpay's official test card page:

- https://razorpay.com/docs/payments/payments/test-card-details/?preferred-country=IN

Razorpay's test card flow supports:

- success
- failure
- domestic/international variations
- EMI and other supported test scenarios

Typical test-mode behavior:

1. Enter a Razorpay-provided test card number from the docs.
2. Use any random CVV.
3. Use any future expiry date.
4. Complete the mock bank page.
5. Choose `Success` or `Failure`.

Do not use real cards in Test Mode.

## 8. What Success Looks Like

After a successful online payment:

1. Razorpay popup closes successfully.
2. The frontend calls `/api/payments/verify`.
3. The app redirects to `/checkout/success`.
4. Orders appear in the user order list.
5. Admin can see the payment in `/admin/payments`.

Expected database state:

### `payments` collection

- `status = PAID`
- `method = ONLINE`
- `razorpayOrderId` is set
- `razorpayPaymentId` is set
- `orderIds` contains created order ids
- `paidAt` is set

### `orders` collection

- `paymentStatus = Paid`
- `paymentMethod = ONLINE`
- `paymentRecordId` is set
- `razorpayOrderId` is set
- `razorpayPaymentId` is set
- `status = Placed`

### `payouts` collection

- payout records exist for vendor orders
- status initially stays on hold until delivery/payout eligibility logic advances it

## 9. What Failure Looks Like

Test with:

- `failure@razorpay`, or
- a failure card flow from Razorpay's test card docs

Expected result:

1. Payment should not be treated as paid.
2. User should not be redirected to success with fake paid orders.
3. Payment record should remain failed or unconfirmed.
4. No incorrect paid order should be created.

Check:

- `/admin/payments`
- MongoDB `payments`
- MongoDB `orders`

## 10. Webhook Testing

Your backend webhook endpoint is:

```text
/api/webhooks/razorpay
```

For local testing, Razorpay needs a public URL. Use a tunnel.

Recommended approach from Razorpay docs:

- use a staging/public URL, or
- use a supported tunnel such as `zrok`

Example public webhook URL:

```text
https://your-public-url/api/webhooks/razorpay
```

### Configure the webhook

In Razorpay Test Mode:

1. Create or edit webhook
2. Set URL to your public endpoint
3. Set the secret
4. Use the same secret in `backend/.env`

Razorpay notes:

- Test webhook events are triggered from Test Mode transactions.
- While setting up/editing/deleting webhook in test mode, Razorpay docs mention default OTP `754081` if prompted.

### Expected webhook behavior in this project

The webhook handler processes:

- `payment.captured`
- `payment.failed`
- `refund.processed`

Expected database state:

- webhook events stored in `WebhookEvent`
- payment record updated with status
- refund record updated when refund webhook is received

## 11. Local Verification Checklist

### User side

Check:

- checkout popup opens
- payment succeeds
- success page loads
- order shows in `/orders`

### Admin side

Check:

- `/admin/payments`
- `/admin/refunds`
- `/admin/payouts`
- `/admin/payment-details/:paymentId`

### Vendor side

Check:

- `/vendor/earnings`
- `/vendor/payouts`

### MongoDB collections

Check:

- `payments`
- `orders`
- `refunds`
- `payouts`
- `webhookevents`

## 12. Refund Testing

After you have one successful online payment:

1. Open `/admin/payments`
2. Click `Refund`
3. Enter amount and reason
4. Submit refund

Expected result:

### Full refund

- payment status becomes `REFUNDED`
- order payment status becomes `Refunded`
- pending payout is cancelled

### Partial refund

- payment status becomes `PARTIALLY_REFUNDED`
- order payment status becomes `Partially Refunded`

Then verify:

- `/admin/refunds`
- `refunds` collection
- related payment and order documents

## 13. Payout Testing

This project creates payout records on order creation, then releases them after delivery and payout-delay logic.

### To test payout records in app

1. Create a successful order
2. Mark order as delivered
3. Confirm payout moves into eligible/pending state after delivery logic
4. Open `/admin/payouts`
5. Trigger payout processing

### To test RazorpayX payout execution

Use RazorpayX Test Mode:

1. Switch RazorpayX to `Test Mode`
2. Add test balance
3. Create or use a vendor with bank details
4. Use a valid `RAZORPAY_PAYOUT_SOURCE_ACCOUNT`
5. Process payout from the admin screen

Expected:

- contact/fund account can be created in test mode
- payout gets a transfer id
- payout status becomes `PAID`

Official reference:

- https://razorpay.com/docs/x/dashboard/test-mode/

## 14. High-Value Test Scenarios

Run these in order:

1. Successful online payment with UPI
2. Successful online payment with card
3. Failed payment
4. Refresh page after payment success
5. Duplicate verify request
6. Webhook retry / duplicate webhook
7. Full refund
8. Partial refund
9. Delivered COD order
10. Delivered online order payout release
11. Payout processing in RazorpayX test mode

## 15. Common Problems

### Razorpay popup does not open

Check:

- frontend is running
- browser is not blocking popup
- `RAZORPAY_KEY_ID` exists
- checkout script loads successfully

### Payment popup opens but verify fails

Check:

- `RAZORPAY_KEY_SECRET` matches the key id
- backend is running
- `/api/payments/verify` is reachable
- signature comparison uses matching test credentials

### Webhook fails signature validation

Check:

- `RAZORPAY_WEBHOOK_SECRET` matches dashboard webhook secret exactly
- webhook URL is pointing to the correct backend
- test webhook events are sent from Test Mode

### Payout processing fails

Check:

- vendor bank details exist
- RazorpayX is in Test Mode
- test balance has been added
- `RAZORPAY_PAYOUT_SOURCE_ACCOUNT` is set

## 16. App-Specific Routes to Use

User:

- `/checkout`
- `/checkout/success`
- `/orders`

Admin:

- `/admin/payments`
- `/admin/refunds`
- `/admin/payouts`
- `/admin/payment-details/:paymentId`

Vendor:

- `/vendor/earnings`
- `/vendor/payouts`

## 17. Recommended Demo Script

If you want to demo this to a client or team:

1. Log in as user
2. Add item to cart
3. Go to checkout
4. Choose Razorpay
5. Pay using `success@razorpay`
6. Show `/checkout/success`
7. Show `/orders`
8. Switch to admin and open `/admin/payments`
9. Open payment details page
10. Trigger refund
11. Show `/admin/refunds`
12. Mark order delivered
13. Show `/admin/payouts`
14. Trigger payout in test mode

## 18. Source Notes

This guide uses current official Razorpay documentation for test-mode behavior:

- Test cards: https://razorpay.com/docs/payments/payments/test-card-details/?preferred-country=IN
- Test UPI IDs: https://razorpay.com/docs/payments/payments/test-upi-details/?preferred-country=IN
- Webhook testing: https://razorpay.com/docs/webhooks/validate-test/
- RazorpayX test mode: https://razorpay.com/docs/x/dashboard/test-mode/

If Razorpay changes test credentials or dashboard flow later, prefer the official docs above over screenshots or older notes.
