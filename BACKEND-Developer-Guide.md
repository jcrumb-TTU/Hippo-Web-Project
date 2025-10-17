# Backend Developer Guide for Hippo-Web-Project

This document is derived from the frontend code under `web-pages/` and lists the API endpoints, request/response contracts, authentication expectations, validation rules, and helpful server-side notes needed to support the static frontend.

Date: 2025-10-17

---

## Overview

This guide describes the backend contracts required by the frontend pages under `web-pages/user_login/`. The frontend uses cookie-based authentication by default and communicates with the API using fetch(..., { credentials: 'include' }). The guide lists endpoints the frontend calls, expected request and response shapes, validations, and edge cases.

Global assumptions:
- Cookie-based auth is the default. If your backend returns a token instead, the frontend can operate in token mode but currently sets `USE_COOKIES = true`.
- All fetch calls that require authentication send credentials: 'include'. When running API on a different origin during development, ensure CORS headers permit credentials (Access-Control-Allow-Credentials: true and exact Access-Control-Allow-Origin, not `*`).

---

## Global / Authentication

- GET /api/me
  - Purpose: quick auth check.
  - Response: 200 + JSON with basic user/session info or 401 when not authenticated.

- POST /api/login
  - Request: JSON { email, password }
  - Response: 200 on success. When using cookies, Set-Cookie must be sent. Optionally return user info or token.

- POST /api/register
  - Request: JSON { firstName, lastName, email, phone?, password, confirmPassword, terms }
  - Response: 200/201 on success. Set cookie or return token.

- POST /api/logout
  - Purpose: clear server-side session / auth cookie
  - Response: 200 on success

Notes:
- For cross-origin cookie usage, set SameSite=None; Secure on the cookie and return Access-Control-Allow-Credentials: true.
- Frontend often calls GET /api/me after login to confirm the cookie was set.

---

## Endpoints and Contracts (per-page)

### 1) Login / Sign-up
Files: `web-pages/user_login/login.html`, `web-pages/user_login/signup.html`, `web-pages/user_login/auth.js`

- POST /api/login
  - Content-Type: application/json
  - Body: { email: string, password: string }
  - Success: 200 (cookie set). Body can be JSON with user info or { token } for token mode.
  - Failure: 400/401 with JSON { message: string }.

- POST /api/register
  - Content-Type: application/json
  - Body: { firstName, lastName, email, phone?, password, confirmPassword, terms }
  - Success: 201/200 (cookie set). Return JSON summary or redirect info.

Server-side recommendations:
- Enforce password/confirmPassword match.
- Return clear validation messages on 400.

---

### 2) Session check / basic user info
Files: called by many pages

- GET /api/me
  - Purpose: confirm an authenticated session
  - Response: 200 + JSON { id, email, name, roles? } or 401

---

### 3) Items (postings)
Files: `web-pages/user_login/dashboard/postings/postings.js`, `web-pages/user_login/dashboard/postings/add_item/add_item.js`

- GET /api/items?mine=1
  - Purpose: fetch the current user's items
  - Response: 200 + JSON array of items
  - Minimum fields expected:
    - id
    - itemName or title
    - description
    - images: array of URLs OR thumbnailUrl
    - maintenanceTasks: optional array

- GET /api/items/:id
  - Purpose: fetch single item for edit/prefill
  - Response: 200 + item object

- POST /api/items
  - Purpose: create a new item (multipart/form-data)
  - FormData fields:
    - itemName
    - description
    - maintenanceTasks (JSON string)
    - image_0, image_1, ... (file fields)
  - Credentials: include
  - Response: 201 + JSON new item { id, images:[], thumbnailUrl }

- PUT /api/items/:id
  - Purpose: edit existing item (same FormData contract)
  - Must check ownership (403 if not owner)

- DELETE /api/items/:id
  - Purpose: delete a listing (owner-only)

Validation & constraints (frontend derivations):
- Max images: 5
- Max image file size: 10 MB
- Allowed image types: image/png, image/jpeg, image/gif
- itemName: required; max 100 chars
- description: required; max 200 chars
- maintenanceTasks: tasks must include description and frequency to be considered valid

Notes:
- Accept both `image_0..image_n` and `images[]` for multipart flexibility.
- Generate and return thumbnailUrl(s) for quick UI rendering.

---

### 4) Profile / Photo
Files: `web-pages/user_login/dashboard/profile/profile.js`

- GET /api/user/profile
  - Response 200 + JSON:
    {
      id: "user-id",
      firstName?, lastName?, name?, email?,
      bio?,
      photoUrl?,
      loanStats?: { total?:number, active?:number, completed?:number }
    }

- PUT /api/user/profile
  - Request body: { bio: string }
  - Response: 200

- POST /api/user/profile/photo
  - multipart/form-data with 'photo' file
  - Response: 200 + { imageUrl: 'https://.../avatar.jpg' }

- DELETE /api/user/profile/photo
  - Purpose: remove/reset profile photo
  - Response: 200

Notes:
- Allowed file types: PNG/JPG/GIF. Suggest max 5MB. Resize/serve optimized variants.

---

### 5) Edit profile & Settings
Files: `web-pages/user_login/dashboard/profile/edit_profile/edit_profile.js`, `web-pages/user_login/dashboard/profile/settings/settings.js`

- GET /api/user/profile
  - Prefill edit forms

- PUT /api/user/settings
  - edit_profile sends payload like:
    {
      firstName, lastName, name, phone, address: { street, city, state, zip }
    }
  - settings.js sends payload { settings: { emailNotifications: boolean } }
  - Server should accept either form. Return 200.

UX: frontend shows a "saved" toast then redirects to `../profile.html` after ~600ms, so keep responses quick.

---

### 6) Loans / Lendings
Files: `web-pages/user_login/dashboard/profile/profile.js`, `web-pages/user_login/dashboard/lendings/lendings.js`

- GET /api/user/loans
  - Accepts either:
    - Array of loans: [ { id, status, ... }, ... ] — frontend derives stats
    - Or stats object: { total, active, completed }
  - If unavailable frontend shows a warning or uses loanStats in profile.

- Optional endpoints for marking returns:
  - POST /api/user/loans/:id/return or PUT /api/user/loans/:id to update status

---

## Error handling & conventions
- Return JSON error payloads: { message: '...' }
- Status codes: 200/201, 400 validation, 401 unauthorized, 403 forbidden, 404 not found, 500 server
- For file upload validation return 400 and a clear message (e.g., "Max 5 images allowed").

---

## Security & CORS
- For cross-origin development: set Access-Control-Allow-Credentials: true and an explicit Access-Control-Allow-Origin matching the front-end origin.
- Set cookies with SameSite=None; Secure when cross-site.
- Sanitize file uploads, avoid storing user filenames directly, and protect upload endpoints from CSRF (cookie-based flows require CSRF mitigation if the API is not strictly same-origin).

---

## Implementation notes & recommendations
- Accept multiple file field naming styles for `POST /api/items` (image_0.. or images[]).
- Include thumbnail URLs for quick first-load images.
- Return structured error messages to show to users.
- Provide loanStats in `GET /api/user/profile` to avoid extra calls when possible.

---

## Minimal test ideas
- Auth: login sets cookie and GET /api/me returns 200.
- Items: create item via multipart with valid images → 201; create with >5 images → 400.
- Profile: upload avatar with invalid type → 400; delete avatar → 200.
- CORS: verify Access-Control-Allow-Credentials and specific allowed origin when frontend origin differs.

---

## File → Backend responsibility mapping
- `web-pages/user_login/auth.js` → /api/login, /api/register, /api/me, /api/logout
- `web-pages/user_login/dashboard/postings/postings.js` → GET /api/items?mine=1
- `web-pages/user_login/dashboard/postings/add_item/add_item.js` → POST /api/items (FormData), PUT /api/items/:id
- `web-pages/user_login/dashboard/profile/profile.js` → GET/PUT /api/user/profile, POST/DELETE /api/user/profile/photo, GET /api/user/loans, POST /api/logout
- `web-pages/user_login/dashboard/profile/edit_profile/edit_profile.js` → GET /api/user/profile, PUT /api/user/settings
- `web-pages/user_login/dashboard/profile/settings/settings.js` → PUT /api/user/settings

---

## Next steps (suggested)
- Convert this document into an OpenAPI spec for the backend team.
- Provide C# ASP.NET controller stubs that implement these routes with sample validation.
- Add a small Postman collection or PowerShell curl examples to help backend devs verify endpoints locally.

---

If youd like I can now generate an OpenAPI YAML file or create small server stubs (ASP.NET) for these endpoints. Let me know which format you prefer.
