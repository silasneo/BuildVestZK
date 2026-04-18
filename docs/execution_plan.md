# 0. Current Implementation Status (Hackathon Snapshot)

- [x] ✅ Backend setup complete (PR #3 merged: NestJS + Prisma + SQLite + JWT + TierRulesEngine + mock proof)
- [x] ✅ Backend API testing complete (local test cases passing)
- [x] ✅ Deployment configs complete (Railway + Vercel configured)
- [x] ✅ Stellar testnet setup complete for account bootstrap (keypair generated + funded via Friendbot)
- [ ] 🔄 Frontend scaffold in progress (Vite + React + Tailwind + core pages)
- [x] ✅ Noir ZK circuit implementation complete (`circuits/balance_check` + backend Noir prover integration with mock fallback)
- [ ] 🔜 Stellar on-chain integration (ManageData + Soroban verification) after ZK circuit
- [ ] 🔜 Reset/demo script after integration
- [ ] 🔜 Final polish + deploy verification (last step)

> Note: Stellar CLI installation is still pending and required before Soroban contract deployment.

# 1. Recommended Hackathon Strategy

- Start a **fresh repo** for `BuildVestZK`; do not import code from main BuildVest MVP repos.
- Use a **monolith**: one NestJS backend + one React frontend for fastest shipping.
- Use **SQLite via Prisma** (no Docker) for zero-friction setup.
- Skip real PDF parsing initially; accept structured JSON month balances and use PDFs as visual demo props.
- Use **Noir** for ZK with a tiny circuit (3 threshold comparisons).
- Implement proof flow in phases: **mock proof first**, then swap to real Noir proving.
- Include both:
  - **Stellar ManageData anchoring**
  - **UltraHonk Soroban on-chain verifier** (promote from stretch to core demo)

# 2. Minimal Technical Stack

| Layer | Tool |
|-------|------|
| Backend | NestJS + TypeScript |
| Frontend | React + Vite + Tailwind |
| Database | SQLite via Prisma |
| File upload | `multer` (NestJS built-in) — visual only |
| PDF parsing | Skip — accept structured JSON |
| ZK circuit | Noir (`nargo`) |
| ZK proving | `@noir-lang/noir_js` + `@noir-lang/backend_barretenberg` |
| Stellar | `@stellar/stellar-sdk` |
| Stellar network | Testnet |
| Auth | Simple JWT (`jsonwebtoken`) |
| Soroban verification | `ultrahonk_soroban_contract` verifier on Soroban testnet |

# 3. Repo Structure

```text
BuildVestZK/
├── backend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── jwt.guard.ts
│   │   ├── eligibility/
│   │   │   ├── eligibility.module.ts
│   │   │   ├── eligibility.controller.ts
│   │   │   ├── eligibility.service.ts
│   │   │   └── tier-rules.engine.ts
│   │   ├── proof/
│   │   │   ├── proof.module.ts
│   │   │   ├── proof.service.ts
│   │   │   ├── stellar.service.ts
│   │   │   └── soroban-verifier.service.ts
│   │   └── prisma/
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── SignupLogin.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── UpgradeToPrime.tsx
│   │   ├── components/
│   │   │   ├── TierBadge.tsx
│   │   │   ├── StatementUpload.tsx
│   │   │   └── ProofStatus.tsx
│   │   └── lib/
│   │       └── api.ts
│   ├── package.json
│   └── vite.config.ts
├── zk/
│   ├── Nargo.toml
│   └── src/
│       └── main.nr
├── scripts/
│   └── reset-and-demo.ts
├── test-data/
│   ├── statement-pass.json
│   ├── statement-fail.json
│   ├── statement-pass.pdf
│   └── statement-fail.pdf
├── docs/
│   ├── execution_plan.md
│   └── DEMO_SCRIPT.md
├── .env.example
└── README.md
```

# 4. End-to-End Demo Flow

1. Open app → Landing page explains BuildVestZK hackathon context.
2. Signup new user → auto-login → Dashboard shows **RETAIL Investor** badge.
3. Click **Upgrade to PRIME** → upload bank statement (visual) + submit 3 balances.
4. Backend `TierRulesEngine` checks `monthBalances.every(b => b > 1000)`.
5. PASS path: generate Noir proof → verify with Soroban UltraHonk contract → anchor proof hash in Stellar ManageData → upgrade user to PRIME.
6. FAIL path: return `REJECTED`, keep user tier as RETAIL.
7. Dashboard refreshes with **⭐ PRIME Investor**, Stellar tx hash link, Soroban tx hash link.
8. Demo second user with FAIL statement to show rejection path.

# 5. Minimal Backend Design

## Prisma schema (SQLite)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum InvestorTier {
  RETAIL
  PRIME
}

enum EligibilityStatus {
  NONE
  SUBMITTED
  APPROVED
  REJECTED
}

model User {
  id             String               @id @default(cuid())
  email          String               @unique
  hashedPassword String
  tier           InvestorTier         @default(RETAIL)
  createdAt      DateTime             @default(now())
  eligibility    EligibilityProfile?
}

model EligibilityProfile {
  id                 String            @id @default(cuid())
  userId             String            @unique
  user               User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  status             EligibilityStatus @default(NONE)
  monthBalances      String?
  qualified          Boolean?
  proofHash          String?
  stellarTxHash      String?
  sorobanTxHash      String?
  stellarAccountId   String?
  verificationMethod String?
  evaluatedAt        DateTime?
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
}
```

## API endpoints (4 total)

- `POST /auth/signup` → register, return JWT + user
- `POST /auth/login` → authenticate, return JWT + user
- `GET /eligibility/status` → returns tier + eligibility + proof details
- `POST /eligibility/evaluate` → accepts `{ monthBalances: [n,n,n] }`, runs rule + proof + Stellar in one call

## TierRulesEngine (minimal)

```ts
// backend/src/eligibility/tier-rules.engine.ts
export class TierRulesEngine {
  private readonly threshold = 1000;

  qualifiesForPrime(monthBalances: number[]): boolean {
    if (!Array.isArray(monthBalances) || monthBalances.length !== 3) return false;
    return monthBalances.every((b) => b > this.threshold);
  }
}
```

## ProofService (mock-first, then real Noir)

```ts
// backend/src/proof/proof.service.ts
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class ProofService {
  async generateMockProof(userId: string, monthBalances: number[]) {
    const claim = {
      userId,
      type: 'PRIME_ELIGIBILITY',
      threshold: 1000,
      monthCount: 3,
      ts: Date.now(),
    };

    const proofHash = createHash('sha256')
      .update(JSON.stringify({ claim, monthBalances }))
      .digest('hex');

    return {
      mode: 'mock',
      proofHash,
      publicInputs: { threshold: 1000 },
    };
  }

  async generateNoirProof(monthBalances: number[]) {
    // Phase 2/3 integration sketch
    // 1) Load circuit artifacts from zk/target
    // 2) Build input map with private balances + public threshold
    // 3) Use noir_js + barretenberg backend to generate and verify proof
    // 4) Return serialized proof + proof hash
    return {
      mode: 'noir',
      proof: '<serialized_proof>',
      publicInputs: { threshold: 1000 },
      proofHash: '<sha256_of_proof_or_claim>',
      verified: true,
    };
  }
}
```

## StellarService (ManageData anchor)

```ts
// backend/src/proof/stellar.service.ts
import { Injectable } from '@nestjs/common';
import { Keypair, Networks, Operation, TransactionBuilder, Horizon } from '@stellar/stellar-sdk';

@Injectable()
export class StellarService {
  private server = new Horizon.Server(process.env.STELLAR_HORIZON_URL!);

  async anchorPrimeProof(userId: string, proofHash: string) {
    const source = Keypair.fromSecret(process.env.STELLAR_SECRET_KEY!);
    const account = await this.server.loadAccount(source.publicKey());

    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.manageData({
          name: `bv_prime_${userId}`,
          value: proofHash,
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(source);
    const result = await this.server.submitTransaction(tx);

    return {
      txHash: result.hash,
      accountId: source.publicKey(),
      horizonUrl: `${process.env.STELLAR_HORIZON_URL}/transactions/${result.hash}`,
    };
  }
}
```

## SorobanVerifierService (UltraHonk verifier)

```ts
// backend/src/proof/soroban-verifier.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class SorobanVerifierService {
  async verifyOnChain(params: {
    serializedProof: string;
    publicInputs: { threshold: number };
  }) {
    const contractId = process.env.SOROBAN_VERIFIER_CONTRACT_ID;

    if (!contractId) {
      return {
        verified: true,
        method: 'offchain-fallback',
        sorobanTxHash: null,
      };
    }

    // Production hackathon path: invoke deployed ultrahonk verifier contract
    // with proof + public inputs through Soroban RPC / SDK.
    const sorobanTxHash = '<soroban_tx_hash_after_contract_invoke>';

    return {
      verified: true,
      method: 'soroban-onchain-ultrahonk',
      sorobanTxHash,
    };
  }
}
```

# 6. Minimal Frontend Design

## Required pages

- `Landing (/ )`: hero + “How it works” + CTA + hackathon footer
- `SignupLogin (/auth)`: email/password with signup/login toggle
- `Dashboard (/dashboard)`: tier badge, status, tx links, upgrade CTA
- `UpgradeToPrime (/upgrade)`: statement upload visual + 3 balances + submit + result

## API client (axios + token injection)

```ts
// frontend/src/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

## TierBadge component

```tsx
// frontend/src/components/TierBadge.tsx
type Props = { tier: 'RETAIL' | 'PRIME' };

export function TierBadge({ tier }: Props) {
  if (tier === 'PRIME') {
    return <span className="rounded bg-yellow-100 px-3 py-1 font-semibold">⭐ PRIME Investor</span>;
  }
  return <span className="rounded bg-slate-100 px-3 py-1 font-semibold">RETAIL Investor</span>;
}
```

## StatementUpload component (visual only)

```tsx
// frontend/src/components/StatementUpload.tsx
type Props = { onFile: (file: File | null) => void };

export function StatementUpload({ onFile }: Props) {
  return (
    <input
      type="file"
      accept="application/pdf"
      onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      className="block w-full rounded border p-2"
    />
  );
}
```

## ProofStatus component

```tsx
// frontend/src/components/ProofStatus.tsx
type Props = {
  status: 'NONE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  stellarTxHash?: string | null;
  sorobanTxHash?: string | null;
};

export function ProofStatus({ status, stellarTxHash, sorobanTxHash }: Props) {
  return (
    <div className="space-y-1 text-sm">
      <p>Status: {status}</p>
      {stellarTxHash && <p>Stellar TX: {stellarTxHash}</p>}
      {sorobanTxHash && <p>Soroban TX: {sorobanTxHash}</p>}
    </div>
  );
}
```

# 7. ZK Design — Noir Circuit

```noir
fn main(
    month1_balance: u64,  // private
    month2_balance: u64,  // private
    month3_balance: u64,  // private
    threshold: pub u64,   // public (1000)
) {
    assert(month1_balance > threshold);
    assert(month2_balance > threshold);
    assert(month3_balance > threshold);
}
```

- Private inputs: 3 actual balances (never revealed publicly)
- Public input: threshold (`1000`)
- Flow: parse/collect balances off-chain → generate proof in backend → verify (Soroban on-chain preferred, off-chain fallback) → anchor proof hash with ManageData

## Architecture clarification — where Noir runs

- The Noir circuit runs **locally inside the Node.js backend** using:
  - `@noir-lang/noir_js`
  - `@noir-lang/backend_barretenberg`
- Private inputs (actual bank balances) stay in backend memory/process context and **never leave the backend server**.
- The backend only sends proof bytes + public threshold value to Soroban for verification.

# 8. Stellar Integration

- **ManageData:** write `bv_prime_{userId} = proofHash` to testnet account data
- **Soroban on-chain verification:** deploy `ultrahonk_soroban_contract`, submit proof for verification
- If on-chain verifier unavailable, use off-chain verification and still anchor hash on testnet

## Architecture clarification — on-chain verification flow

1. Backend generates proof locally from private balances.
2. Backend submits proof + public threshold to deployed UltraHonk verifier contract.
3. Soroban verifier contract runs verification **on-chain** and returns `true/false`.
4. Backend reads the Soroban transaction response and then:
   - stores `{ sorobanTxHash, proofHash }` in local SQLite (`EligibilityProfile`)
   - writes a Stellar `ManageData` entry as human-readable proof record

## Stellar testnet credentials (no external accounts needed)

- Keypair generation: local `Keypair.random()` (no signup)
- Funding: one Friendbot HTTP call (free 10,000 XLM)
- Soroban RPC: `https://soroban-testnet.stellar.org` (no API key)
- Horizon API: `https://horizon-testnet.stellar.org` (no API key)
- Wallet app: not required; backend directly holds the secret key
- External tool needed: Stellar CLI (for verifier contract deployment)

Setup checklist:
1. Create Stellar testnet keypair
2. Fund with friendbot
3. Configure Horizon + Soroban RPC URLs
4. Deploy verifier contract and set `SOROBAN_VERIFIER_CONTRACT_ID`

# 9. Bank Statement Test Data

## JSON examples

```json
// test-data/statement-pass.json
{
  "accountHolder": "Demo User A",
  "currency": "USD",
  "monthEndBalances": {
    "2026-01": 1500,
    "2026-02": 2300,
    "2026-03": 1800
  }
}
```

```json
// test-data/statement-fail.json
{
  "accountHolder": "Demo User B",
  "currency": "USD",
  "monthEndBalances": {
    "2026-01": 1400,
    "2026-02": 800,
    "2026-03": 1700
  }
}
```

## PDF generation script (demo props)

```ts
// scripts/generate-test-pdfs.ts
import fs from 'node:fs';
import PDFDocument from 'pdfkit';

function renderPdf(title: string, rows: Array<{ month: string; balance: number }>, outFile: string) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(outFile));

  doc.fontSize(18).text(title);
  doc.moveDown();
  doc.fontSize(12).text('Month-End Balances (USD)');
  doc.moveDown(0.5);

  rows.forEach((r) => doc.text(`${r.month}: $${r.balance.toFixed(2)}`));

  doc.end();
}

renderPdf(
  'BuildVestZK Demo Statement (PASS)',
  [
    { month: '2026-01', balance: 1500 },
    { month: '2026-02', balance: 2300 },
    { month: '2026-03', balance: 1800 },
  ],
  'test-data/statement-pass.pdf',
);

renderPdf(
  'BuildVestZK Demo Statement (FAIL)',
  [
    { month: '2026-01', balance: 1400 },
    { month: '2026-02', balance: 800 },
    { month: '2026-03', balance: 1700 },
  ],
  'test-data/statement-fail.pdf',
);
```

# 10. Reset & Re-run Script

```ts
// scripts/reset-and-demo.ts
import axios from 'axios';

const mode = process.argv[2] === 'fail' ? 'fail' : 'pass';
const API = process.env.API_URL || 'http://localhost:3000';

const base = mode === 'pass' ? [1500, 2300, 1800] : [1400, 800, 1700];
const jitter = () => Math.floor(Math.random() * 15);
const monthBalances = base.map((n) => n + jitter());

async function run() {
  await axios.post(`${API}/internal/reset-demo`); // wipes profiles + resets tiers

  const email = `demo-${mode}@buildvestzk.dev`;
  const password = 'demo-password-123';

  const signup = await axios.post(`${API}/auth/signup`, { email, password });
  const token = signup.data.token;

  const result = await axios.post(
    `${API}/eligibility/evaluate`,
    { monthBalances },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const data = result.data;
  console.log('Mode:', mode);
  console.log('Balances:', monthBalances);
  console.log('Tier:', data.tier);
  console.log('Eligibility:', data.status);
  console.log('Stellar TX:', data.stellarTxHash || 'n/a');
  console.log('Soroban TX:', data.sorobanTxHash || 'n/a');

  if (data.stellarTxHash) {
    console.log(`Horizon: https://horizon-testnet.stellar.org/transactions/${data.stellarTxHash}`);
    console.log(`Explorer: https://stellar.expert/explorer/testnet/tx/${data.stellarTxHash}`);
  }
}

run().catch((err) => {
  console.error(err.response?.data || err.message);
  process.exit(1);
});
```

Run with:

```bash
npx ts-node scripts/reset-and-demo.ts pass
npx ts-node scripts/reset-and-demo.ts fail
```

# 11. Build Order (updated with additions)

| # | Task | Time | Priority |
|---|------|------|----------|
| 1 | Scaffold repo + backend (nest new) | 2 min | — |
| 2 | Add Prisma + SQLite, write schema, migrate | 8 min | 🔴 |
| 3 | Auth module: signup + login (bcrypt + JWT) | 20 min | 🔴 |
| 4 | Simple JWT guard | 5 min | 🔴 |
| 5 | TierRulesEngine (8 lines) | 2 min | 🔴 |
| 6 | ProofService (mock — SHA-256 hash) | 5 min | 🔴 |
| 7 | EligibilityController: GET /status + POST /evaluate | 15 min | 🔴 |
| 8 | Test with curl: signup → evaluate → check DB | 5 min | 🔴 |
| 9 | Scaffold frontend (Vite + React + Tailwind) | 5 min | — |
| 10 | API client (axios, token injection) | 5 min | 🔴 |
| 11 | **Landing page** (hero + how it works + CTA + hackathon footer) | 15 min | 🔴 |
| 12 | SignupLogin page | 15 min | 🔴 |
| 13 | Dashboard page (tier badge, status, upgrade button) | 15 min | 🔴 |
| 14 | UpgradeToPrime page (upload visual + balance inputs + submit + result) | 20 min | 🔴 |
| 15 | Generate test PDFs | 5 min | 🟡 |
| 16 | Install Noir (noirup) | 3 min | 🟡 |
| 17 | Write Noir circuit (3 assertions) | 5 min | 🟡 |
| 18 | Compile circuit (nargo compile) | 2 min | 🟡 |
| 19 | Swap ProofService to real Noir (noir_js + barretenberg) | 20 min | 🟡 |
| 20 | Test real proof generation + verification | 10 min | 🟡 |
| 21 | Generate Stellar testnet keypair + fund via friendbot | 2 min | 🟢 |
| 22 | StellarService: ManageData tx | 10 min | 🟢 |
| 23 | Clone + build + deploy ultrahonk_soroban_contract to Soroban testnet | 15 min | 🟢 |
| 24 | SorobanVerifierService: on-chain proof verification | 20 min | 🟢 |
| 25 | Wire into evaluate flow: proof → Soroban verify → ManageData anchor | 10 min | 🟢 |
| 26 | Frontend: show Stellar + Soroban tx hashes + links | 5 min | 🟢 |
| 27 | Test full flow end-to-end | 10 min | 🟢 |
| 28 | **Reset script** (`reset-and-demo.ts`) | 10 min | 🟢 |
| 29 | Demo polish: README, demo script | 15 min | — |
| **TOTAL** | | **~4.5 hours** | |

# 12. What to Mock vs What to Make Real

| Component | Hackathon v1 | Final demo target |
|---|---|---|
| Auth | Real (JWT + bcrypt) | Real |
| Tier check | Real (`every(b > 1000)`) | Real |
| File upload UX | Real visual upload | Real visual upload |
| PDF extraction | **Mocked** (manual/JSON input) | Optional lightweight parser |
| Proof generation | Start **mock hash** | Replace with real Noir proof |
| Proof verification | Off-chain fallback allowed | **On-chain Soroban UltraHonk** |
| Stellar anchor | Real ManageData testnet write | Real |
| Explorer links | Real | Real |

# 13. Risks and Time Traps

- Noir/npm version mismatch across `nargo`, `noir_js`, and barretenberg
- WASM/runtime issues in Node.js during proof generation
- Soroban contract deployment/config delays
- Over-engineering API/domain model beyond RETAIL→PRIME demo scope
- Spending time on robust PDF parsing instead of demo-visible outcomes

# 14. `.env.example`

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="hackathon-secret-change-me"
STELLAR_SECRET_KEY=""
STELLAR_HORIZON_URL="https://horizon-testnet.stellar.org"
SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
SOROBAN_VERIFIER_CONTRACT_ID=""
FRONTEND_URL="" # e.g. https://buildvestzk.vercel.app
PORT=3000
```

# 15. Updated Demo Script

```text
1. Show landing page with hackathon context
2. Show config: threshold = $1000
3. Upload PASS statement as RETAIL user → ZK proof generated
4. Show: "Proof verified ON-CHAIN by Soroban contract"
5. Show Soroban tx hash → link to Stellar Explorer
6. Show ManageData entry → link to Horizon
7. User upgraded to ⭐ PRIME
8. Upload FAIL statement as another user → "Does not qualify"
9. User stays RETAIL
10. Run reset script → re-run with different balances → new unique proof + new Stellar tx
```

# 16. Final Recommendation

Build in this order:

1. Backend with mock proof (**~60 min**)
2. Frontend with landing page (**~75 min**)
3. Real Noir proof (**~45 min**)
4. Stellar ManageData + Soroban on-chain verification (**~60 min**)
5. Reset script + polish (**~25 min**)

Pitch to judges:

> BuildVest lets RETAIL investors upgrade to PRIME by proving they meet financial eligibility requirements **without revealing actual balances**. The proof is generated with a Noir ZK circuit, verified on-chain by a Soroban smart contract using UltraHonk, and anchored immutably on Stellar testnet via ManageData.
