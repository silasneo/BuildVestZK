# BuildVestZK

BuildVestZK is a hackathon prototype for privacy-preserving PRIME investor qualification using a NestJS backend, a React frontend, and a phased ZK + Stellar integration roadmap.

## Current Status (Hackathon)

- ✅ Backend foundation complete and tested locally (auth, eligibility engine, mock proof flow)
- ✅ Deployment configuration completed (Railway + Vercel)
- ✅ Backend deployed: `https://buildvestzk.up.railway.app`
- 🔄 Frontend scaffold in progress (Vite + React + Tailwind pages)
- ✅ Frontend deployed: `https://build-vest-zk.vercel.app/`

## Tech Stack

- **Backend:** NestJS + TypeScript + Prisma + SQLite + JWT
- **Frontend:** React + Vite + Tailwind
- **ZK (next phase):** Noir + Barretenberg
- **Blockchain:** Stellar testnet + Soroban (planned verifier contract)

## Local Development Quick Start

### Backend

```bash
cd backend
npm install
npm run start:dev
```

Backend runs at `http://localhost:3000`.

### Demo Commands (Judge Flow)

In a second terminal (keep backend running):

```bash
cd backend
npm run demo         # reset + pass case + fail case
npm run demo:reset   # reset database only
npm run demo:full    # reset, then run demo
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## API Endpoints (No `/api/v1` Prefix)

- `POST /auth/signup`
- `POST /auth/login`
- `GET /eligibility/status`
- `POST /eligibility/evaluate`

All backend routes are root-level (for example: `https://buildvestzk.up.railway.app/auth/signup`).

## Documentation

- Execution plan: [`docs/execution_plan.md`](docs/execution_plan.md)
- Backend API testing guide: [`docs/backend_testing.md`](docs/backend_testing.md)
- Deployment guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## Verified Local API Results

- ✅ `POST /auth/signup` returns `accessToken` + user with `tier=RETAIL`
- ✅ `POST /auth/login` works
- ✅ `GET /eligibility/status` returns `null` before evaluation and profile after evaluation
- ✅ `POST /eligibility/evaluate` with `[1500, 2300, 1800]` returns `qualified=true`, `tier=PRIME`
- ✅ `POST /eligibility/evaluate` with `[1200, 800, 1500]` returns `qualified=false`, `tier=RETAIL`
- ✅ Login after upgrade confirms persisted `tier=PRIME`

## Stellar Testnet Status

- ✅ Testnet keypair generated locally via `Keypair.random()`
- ✅ Testnet account funded via Friendbot (10,000 XLM)
- ⏳ Stellar CLI not yet installed (required for Soroban contract deployment phase)

## Remaining Steps

1. 🔜 Build Noir ZK circuit and real proof flow
2. 🔜 Add Stellar ManageData anchoring + Soroban verifier integration
3. 🔜 Add reset/demo script for repeatable judging demos
4. 🔜 Final deploy pass + demo polish

## Important Note

- Railway currently uses SQLite on an ephemeral filesystem, so demo data resets on redeploy.
