# Nova Exchange - Complete Integration & Fix Changelog

## Overview
Full frontend-backend integration, security hardening, and code cleanup for Nova Exchange (alh777.com + alh777-api).

---

## Frontend Changes (alh777.com)

### 1. Registration Form Refactor (`countries/nigeria/js/auth.js`)
- **Email is now optional**: Users can register without entering an email. When omitted, the backend auto-generates `@nogin.nova.local` email.
- **Email verification flow**: When email is entered, the "Send Code" button sends a 4-digit code via `/api/send-code` (type=register). The code input auto-verifies when 4 digits are typed (calls `/api/verify-code` automatically).
- **Auto-verify on input**: `autoVerifyRegCode()` function monitors the verification code input - when length reaches 4, it automatically calls the verify API and marks email as verified.
- **Toggle send button**: `toggleRegSendBtn()` enables/disables the "Send Code" button based on whether the email field has content.
- **Validation logic**: If email is filled but not verified, registration is blocked with "Please verify your email first". If email is empty, registration proceeds without verification.
- Removed the old `verifyRegisterCode(code).then(...)` chain from `handleRegister` - replaced with synchronous check of `_regEmailVerified`.

### 2. Bind Email Security (`countries/nigeria/js/auth.js`)
- `handleBindEmail()` now passes `verifyToken` to the backend along with `email` and `code`, enabling the backend to independently verify the code.

### 3. API Base Configurable (`countries/nigeria/js/api.js`)
- Added `API_BASE` with localStorage support (read from `nova_api_base` with production fallback).
- Added `setApiBase(url)` function to allow runtime reconfiguration.
- Both API_BASE and setApiBase are now also in `api.js` (not just `auth.js`).

### 4. Deleted Redundant Files
- `progress.log`
- `account - 副本.html`
- `Nigeria - 副本.html`
- `Nigeria - 副本 - 副本.html`
- `transfer/support.json`

---

## Backend Changes (alh777-api)

### 5. bind-email.js Security Fix (`api/bind-email.js`)
- **Added verification code validation**: Before updating the email, the server now validates the verification code using the same HMAC algorithm as `verify-code.js`.
- Accepts `verifyToken` and `code` from request body, independently verifies them.
- Returns "Invalid or expired verification code" if verification fails.
- Added `crypto` require and `verifyCodeToken()` helper function.

### 6. verify-code.js Anti-Brute-Force (`api/verify-code.js`)
- **Token replay prevention**: After successful verification, the token is marked as "used". Subsequent attempts with the same token return "This verification code has already been used".
- **Brute-force protection**: Tracks failed attempts per token in an in-memory Map. After 3 consecutive failures, the token is invalidated.
- **Periodic cleanup**: Expired entries are cleaned every 60 seconds to prevent memory leaks.
- **Graceful degradation**: In-memory state resets on serverless cold starts (acceptable trade-off).

### 7. Unified Error Response Format
- All API endpoints now return `{ success: true, ... }` for success and `{ error: "message" }` for errors (maintaining backward compatibility with frontend expectations).
- Files updated: `login.js`, `me.js`, `me-transactions.js`, `me-downlines.js`, `me-commissions.js`, `send-code.js`.
- Removed redundant bind-email POST handler from `me.js` (now handled exclusively by `bind-email.js`).

### 8. Route Configuration (`vercel.json`)
- Verified route mappings. The bind-email route correctly maps to `/api/bind-email.js`.

---

## Deployment Notes

### Backend (Railway / Vercel)
1. Deploy the `backend/` directory.
2. Set environment variables:
   - `SUPABASE_URL` - `https://ecikviwuxfieryrmfgdq.supabase.co`
   - `SUPABASE_ANON_KEY` - `sb_publishable_qZmFog48wGY8aMzEzl3P2Q_bFktF5X3`
   - `JWT_SECRET` - `2545b2d1f227be8d8e8cdb3c0b576a8b5da05948a7616ec9810c6f3e93537e96`
   - `ENCRYPTION_KEY` - `96ad19dd1d302c46aceea0edf9759655090b762f947f81a6107382e9681784a0`
   - `RESEND_API_KEY` - `re_dRtDog62_5x6oLYLBWkEHdTNnYhTw7k1o`
   - `VERIFY_SECRET` - A secret key for HMAC verification tokens (e.g., `nova-verify-secret-2026`)
   - `TELEGRAM_BOT_TOKEN` - `8989502569:AAH4rNn0tToMH8n3fQA63oWAQUgUAhXo2Yo`
   - `ADMIN_TG_IDS` - `8481338383`

### Frontend (Vercel / Netlify)
1. Deploy the `frontend/` directory.
2. The default `API_BASE` is set to `https://nova-api-production-f9f4.up.railway.app`.
3. To change the API URL after deployment, set `localStorage.setItem("nova_api_base", "https://your-api.com")` or update the default in `js/api.js` and `js/auth.js`.

### TLS/SSL Warning
- If Vercel deployment shows TLS connection issues, ignore them. The user will handle TLS configuration manually.

---

## Verification Checklist
- [ ] Register without email → success, auto-login
- [ ] Register with email → send code → auto-verify → success, auto-login
- [ ] Login with phone number → success
- [ ] Account page: view profile, transactions, downlines
- [ ] Bind email: send code → verify → bind success
- [ ] Change password: old → new → confirm → success
- [ ] Referral link copy → works
- [ ] Auth header shows avatar when logged in, login/register buttons when not
