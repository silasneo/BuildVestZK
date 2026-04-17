# BuildVestZK Backend API Testing Guide

## Quick-Start (copy/paste)

```bash
# Local
curl -X POST http://localhost:3000/auth/signup -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"Test1234"}'

# Railway (deployed)
curl -X POST https://buildvestzk.up.railway.app/auth/signup -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"Test1234"}'
```

> Save the `accessToken` from the response, then use it as `Authorization: Bearer <token>` for protected endpoints.

---

## 1) Base URLs

- **Local:** `http://localhost:3000`
- **Deployed (Railway):** `https://buildvestzk.up.railway.app`
- **Important:** This backend has **no** `/api/v1` prefix. Use `/auth/signup`, not `/api/v1/auth/signup`.

---

## 2) Prerequisites

- Run locally (or use Railway URL):
  - `cd backend && npm install && npx prisma migrate dev --name init && npm run start:dev`
- Ensure backend `.env` exists:
  - copy `.env.example` to `.env`
  - Windows CMD: `copy .env.example .env`
  - macOS/Linux: `cp .env.example .env`
- Replace placeholders in this doc:
  - `<BASE_URL>` → local or Railway URL
  - `<YOUR_TOKEN>` → JWT from signup/login response

---

## 3) Test Cases

> All curl commands are one-line.

### Test Case 1: Signup — New Investor

**Windows CMD**
```cmd
curl -X POST "<BASE_URL>/auth/signup" -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"Test1234\"}"
```

**macOS/Linux**
```bash
curl -X POST "<BASE_URL>/auth/signup" -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"Test1234"}'
```

**Expected:** `201 Created`, returns access token + RETAIL user.

```json
{
  "accessToken": "<jwt>",
  "user": { "id": 1, "email": "test@test.com", "tier": "RETAIL" }
}
```

> Save `accessToken` for authenticated requests.

### Test Case 2: Signup — Duplicate Email

**Windows CMD**
```cmd
curl -X POST "<BASE_URL>/auth/signup" -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"Test1234\"}"
```

**macOS/Linux**
```bash
curl -X POST "<BASE_URL>/auth/signup" -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"Test1234"}'
```

**Expected:** `409 Conflict` (duplicate email).

```json
{
  "message": "Email already exists",
  "error": "Conflict",
  "statusCode": 409
}
```

### Test Case 3: Login — Valid Credentials

**Windows CMD**
```cmd
curl -X POST "<BASE_URL>/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"Test1234\"}"
```

**macOS/Linux**
```bash
curl -X POST "<BASE_URL>/auth/login" -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"Test1234"}'
```

**Expected:** `200 OK`, returns access token + user object.

```json
{
  "accessToken": "<jwt>",
  "user": { "id": 1, "email": "test@test.com", "tier": "RETAIL" }
}
```

### Test Case 4: Login — Invalid Password

**Windows CMD**
```cmd
curl -X POST "<BASE_URL>/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"Wrong1234\"}"
```

**macOS/Linux**
```bash
curl -X POST "<BASE_URL>/auth/login" -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"Wrong1234"}'
```

**Expected:** `401 Unauthorized`.

```json
{
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "statusCode": 401
}
```

### Test Case 5: Login — Non-existent User

**Windows CMD**
```cmd
curl -X POST "<BASE_URL>/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"nouser@test.com\",\"password\":\"Test1234\"}"
```

**macOS/Linux**
```bash
curl -X POST "<BASE_URL>/auth/login" -H "Content-Type: application/json" -d '{"email":"nouser@test.com","password":"Test1234"}'
```

**Expected:** `401 Unauthorized`.

### Test Case 6: Get Eligibility Status — No Profile Yet

**Windows CMD**
```cmd
curl "<BASE_URL>/eligibility/status" -H "Authorization: Bearer <YOUR_TOKEN>"
```

**macOS/Linux**
```bash
curl "<BASE_URL>/eligibility/status" -H 'Authorization: Bearer <YOUR_TOKEN>'
```

**Expected:** `200 OK`, profile is `null` before first evaluation.

```json
null
```

### Test Case 7: Get Eligibility Status — No Auth

**Windows CMD**
```cmd
curl "<BASE_URL>/eligibility/status"
```

**macOS/Linux**
```bash
curl "<BASE_URL>/eligibility/status"
```

**Expected:** `401 Unauthorized`.

### Test Case 8: Evaluate — PASS Case (All balances > $1000)

**Windows CMD**
```cmd
curl -X POST "<BASE_URL>/eligibility/evaluate" -H "Content-Type: application/json" -H "Authorization: Bearer <YOUR_TOKEN>" -d "{\"monthBalances\":[1500,2300,1800]}"
```

**macOS/Linux**
```bash
curl -X POST "<BASE_URL>/eligibility/evaluate" -H "Content-Type: application/json" -H 'Authorization: Bearer <YOUR_TOKEN>' -d '{"monthBalances":[1500,2300,1800]}'
```

**Expected:** `200 OK`, qualified, tier becomes PRIME.

```json
{
  "qualified": true,
  "tier": "PRIME",
  "proofHash": "<hash>",
  "verificationMethod": "mock"
}
```

### Test Case 9: Evaluate — FAIL Case (One balance < $1000)

First create a second user (e.g., `test2@test.com`) and use that token.

**Windows CMD**
```cmd
curl -X POST "<BASE_URL>/eligibility/evaluate" -H "Content-Type: application/json" -H "Authorization: Bearer <YOUR_TOKEN_USER_B>" -d "{\"monthBalances\":[1200,800,1500]}"
```

**macOS/Linux**
```bash
curl -X POST "<BASE_URL>/eligibility/evaluate" -H "Content-Type: application/json" -H 'Authorization: Bearer <YOUR_TOKEN_USER_B>' -d '{"monthBalances":[1200,800,1500]}'
```

**Expected:** `200 OK`, not qualified, remains RETAIL.

```json
{
  "qualified": false,
  "tier": "RETAIL"
}
```

### Test Case 10: Evaluate — Edge Case (Exactly $1000)

**Windows CMD**
```cmd
curl -X POST "<BASE_URL>/eligibility/evaluate" -H "Content-Type: application/json" -H "Authorization: Bearer <YOUR_TOKEN>" -d "{\"monthBalances\":[1000,1500,2000]}"
```

**macOS/Linux**
```bash
curl -X POST "<BASE_URL>/eligibility/evaluate" -H "Content-Type: application/json" -H 'Authorization: Bearer <YOUR_TOKEN>' -d '{"monthBalances":[1000,1500,2000]}'
```

**Expected:** `200 OK`, FAIL because rule is strictly `> 1000`.

```json
{
  "qualified": false,
  "tier": "RETAIL"
}
```

### Test Case 11: Evaluate — Invalid Input (Wrong number of months)

**Windows CMD**
```cmd
curl -X POST "<BASE_URL>/eligibility/evaluate" -H "Content-Type: application/json" -H "Authorization: Bearer <YOUR_TOKEN>" -d "{\"monthBalances\":[1500,2300]}"
```

**macOS/Linux**
```bash
curl -X POST "<BASE_URL>/eligibility/evaluate" -H "Content-Type: application/json" -H 'Authorization: Bearer <YOUR_TOKEN>' -d '{"monthBalances":[1500,2300]}'
```

**Expected:** `400 Bad Request` validation error (current backend enforces exactly 3 months).

```json
{
  "message": ["monthBalances must contain at least 3 elements", "monthBalances must contain no more than 3 elements"],
  "error": "Bad Request",
  "statusCode": 400
}
```

### Test Case 12: Evaluate — No Auth

**Windows CMD**
```cmd
curl -X POST "<BASE_URL>/eligibility/evaluate" -H "Content-Type: application/json" -d "{\"monthBalances\":[1500,2300,1800]}"
```

**macOS/Linux**
```bash
curl -X POST "<BASE_URL>/eligibility/evaluate" -H "Content-Type: application/json" -d '{"monthBalances":[1500,2300,1800]}'
```

**Expected:** `401 Unauthorized`.

### Test Case 13: Get Eligibility Status — After PASS Evaluation

**Windows CMD**
```cmd
curl "<BASE_URL>/eligibility/status" -H "Authorization: Bearer <YOUR_TOKEN>"
```

**macOS/Linux**
```bash
curl "<BASE_URL>/eligibility/status" -H 'Authorization: Bearer <YOUR_TOKEN>'
```

**Expected:** `200 OK`, APPROVED profile with proof metadata.

```json
{
  "tier": "PRIME",
  "status": "APPROVED",
  "qualified": true,
  "proofHash": "<hash>",
  "verificationMethod": "mock"
}
```

### Test Case 14: Get Eligibility Status — After FAIL Evaluation

**Windows CMD**
```cmd
curl "<BASE_URL>/eligibility/status" -H "Authorization: Bearer <YOUR_TOKEN_USER_B>"
```

**macOS/Linux**
```bash
curl "<BASE_URL>/eligibility/status" -H 'Authorization: Bearer <YOUR_TOKEN_USER_B>'
```

**Expected:** `200 OK`, REJECTED profile.

```json
{
  "tier": "RETAIL",
  "status": "REJECTED",
  "qualified": false,
  "proofHash": null,
  "verificationMethod": null
}
```

### Test Case 15: Login After Upgrade — Verify Tier Persisted

**Windows CMD**
```cmd
curl -X POST "<BASE_URL>/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"Test1234\"}"
```

**macOS/Linux**
```bash
curl -X POST "<BASE_URL>/auth/login" -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"Test1234"}'
```

**Expected:** `200 OK`, user tier remains PRIME.

```json
{
  "accessToken": "<jwt>",
  "user": { "id": 1, "email": "test@test.com", "tier": "PRIME" }
}
```

---

## 4) Full End-to-End Test Flow

1. Signup **User A** and save token.
2. Check `/eligibility/status` (should be `null`).
3. Evaluate User A with passing balances `[1500,2300,1800]` (returns PRIME).
4. Check `/eligibility/status` again (should show `APPROVED`).
5. Login User A again (tier should still be `PRIME`).
6. Signup **User B** and save token.
7. Evaluate User B with failing balances `[1200,800,1500]` (returns RETAIL).
8. Check User B `/eligibility/status` (should show `REJECTED`).

---

## 5) Quick Reference Table

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/signup` | No | Register user with `email/password` (starts as `RETAIL`) |
| POST | `/auth/login` | No | Login and receive JWT + user profile |
| GET | `/eligibility/status` | Yes (Bearer JWT) | Get current user eligibility profile (or `null`) |
| POST | `/eligibility/evaluate` | Yes (Bearer JWT) | Evaluate balances, set status, and update tier |

---

## 6) Troubleshooting

- **`Cannot POST /api/v1/auth/signup`**
  - Remove `/api/v1`. Correct path is `/auth/signup`.
- **`Environment variable not found: DATABASE_URL`**
  - Copy `backend/.env.example` to `backend/.env`.
- **CORS errors from frontend**
  - Backend allows `http://localhost:5173` and configured deployed frontend origins.

