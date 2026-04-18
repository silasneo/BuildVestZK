# Deployment Guide — BuildVestZK

## Frontend → Vercel (free)

### Setup
1. Connect the `silasneo/BuildVestZK` repo to Vercel
2. Set **Root Directory** to `frontend`
3. Framework Preset: Vite
4. Build Command: `npm run build`
5. Output Directory: `dist`

### Environment Variables (Vercel Dashboard)
```env
VITE_API_BASE_URL=https://your-backend.up.railway.app
```

### Deploy
- Auto-deploys on push to `main`
- Preview deploys on PRs

## Backend → Railway (free tier)

### Setup
1. Create a new project on Railway
2. Connect the `silasneo/BuildVestZK` repo
3. Set **Root Directory** to `backend`
4. Railway auto-detects Node.js and uses `railway.json` config

### Environment Variables (Railway Dashboard)
```env
DATABASE_URL=file:./dev.db
JWT_SECRET=<generate-a-random-string>
STELLAR_SECRET_KEY=<your-testnet-secret-key>
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_VERIFIER_CONTRACT_ID=<after-contract-deployment>
VERIFICATION_MODE=local
FRONTEND_URL=https://your-app.vercel.app
PORT=3000
```

> Set `VERIFICATION_MODE=onchain` after deploying the Soroban verifier contract
> (see *Stellar Testnet Setup* below).

### Important: SQLite on Railway
SQLite works but **data resets on each redeploy** (ephemeral filesystem). For the hackathon demo this is acceptable — use the reset script to re-seed after deploy. For persistence, swap to Railway's free Postgres addon:
1. Add PostgreSQL plugin in Railway dashboard
2. Change `schema.prisma` provider to `"postgresql"`
3. Railway auto-sets `DATABASE_URL`

### Deploy
- Auto-deploys on push to `main`
- Monitor logs: `railway logs`

## Stellar Testnet Setup (No Accounts Needed)

```bash
# 1. Generate keypair locally
node -e "
  const { Keypair } = require('@stellar/stellar-sdk');
  const kp = Keypair.random();
  console.log('Public:  ' + kp.publicKey());
  console.log('Secret:  ' + kp.secret());
"

# 2. Fund on testnet (free)
curl https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY

# 3. Install Stellar CLI (for Soroban contract deployment)
brew install stellar-cli
# or: cargo install --locked stellar-cli --features opt

# 4. Configure testnet
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# 5. Deploy UltraHonk verifier contract
# Option A: Use the provided deploy script
./scripts/deploy-verifier.sh
# Option B: Manual deployment
git clone https://github.com/tupui/ultrahonk_soroban_contract
cd ultrahonk_soroban_contract
stellar contract build
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/ultrahonk_soroban_contract.wasm \
  --source YOUR_SECRET_KEY \
  --network testnet
# Save the returned contract ID → SOROBAN_VERIFIER_CONTRACT_ID
# Then set VERIFICATION_MODE=onchain in your .env
```

## Demo URLs (after deployment)

| What | URL |
|------|-----|
| App | `https://buildvestzk.vercel.app` |
| API | `https://buildvestzk-backend.up.railway.app` |
| Stellar proof | `https://horizon-testnet.stellar.org/transactions/{txHash}` |
| Soroban verification | `https://stellar.expert/explorer/testnet/tx/{sorobanTxHash}` |

## Post-Deploy Checklist
- [ ] Frontend loads at Vercel URL
- [ ] `POST /auth/signup` works against Railway backend
- [ ] CORS allows Vercel → Railway requests
- [ ] Signup → evaluate → proof → Stellar tx hash returned
- [ ] Stellar tx visible on Horizon testnet explorer
- [ ] Reset script works: `npx ts-node scripts/reset-and-demo.ts pass`

## Notes
- The user mentioned they have already connected Vercel and created a project for this repo
- The user has signed up to Railway via GitHub auth but has not created a project yet
- Railway project creation is done via `railway init` CLI or the Railway dashboard
