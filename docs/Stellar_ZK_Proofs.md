# BuildVest — Stellar ZK Investor Tier Layer: Deep Architecture Analysis

> **Purpose:** Comprehensive analysis of BuildVest's readiness for a minimal Stellar ZK investor-tier proof integration, including architecture recommendations, risk assessment, and implementation guidance.
>
> **Version:** 2.0
> **Date:** 2026-04-07
> **Status:** ✅ Approved for implementation
> **Companion doc:** [`docs/Stellar_ZK_Proofs_Execution.md`](./Stellar_ZK_Proofs_Execution.md)

---

## Changelog

| Version | Date       | Author   | Summary                                                                                      |
|---------|------------|----------|----------------------------------------------------------------------------------------------|
| 1.0     | 2026-04-07 | Platform | Initial deep architecture analysis — V1 accreditation model                                  |
| 1.1     | 2026-04-07 | Platform | V2 refinements: ProofSubject, tiered gating, explicit claim model                            |
| 2.0     | 2026-04-07 | Platform | V3 rewrite: investor tier model (RETAIL/PRIME), FinancialEligibilityClaim, EligibilityModule split, TierRulesEngine, legal framing |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Codebase Findings](#2-codebase-findings)
3. [Risk Map](#3-risk-map)
4. [Recommended Minimal Architecture](#4-recommended-minimal-architecture)
5. [Design Refinement — Self-Critique](#5-design-refinement--self-critique)
6. [Proposed File-Level Change Plan](#6-proposed-file-level-change-plan)
7. [Prisma / Data Model Recommendation](#7-prisma--data-model-recommendation)
8. [Frontend Integration Recommendation](#8-frontend-integration-recommendation)
9. [Backend Integration Recommendation](#9-backend-integration-recommendation)
10. [Feature Flag Strategy](#10-feature-flag-strategy)
11. [Implementation Sequence](#11-implementation-sequence)
12. [Do Not Do List](#12-do-not-do-list)
13. [Final Verdict](#13-final-verdict)
14. [Stretch Task — Minimal Hackathon PoC](#14-stretch-task--minimal-hackathon-poc)
15. [V1 → V2 → V3 Comparison Table](#15-v1--v2--v3-comparison-table)

---

## 1. Executive Summary

BuildVest is building a real-estate investment platform targeting Nigerian retail and high-net-worth investors. As the platform matures it needs to distinguish between **RETAIL** investors (standard access, default tier) and **PRIME** investors (higher-value deals, larger minimum tickets, cross-border structures). This distinction must be:

1. **Verifiable** — backed by real financial data, not self-declaration.
2. **Privacy-preserving** — users reveal their tier, not their raw bank statements.
3. **Portable** — the proof can follow the user across platform contexts (frontend badge, backend gating, future wallet operations).
4. **Legally defensible** — clearly positioned as a **platform product feature**, not a regulatory accreditation determination.

### V3 Architecture: Investor Tier ZK

The V3 design centres on a **two-tier investor model** anchored in two clean ZK claim types:

| Claim | Purpose |
|-------|---------|
| `FinancialEligibilityClaim` | Encodes verified investor tier (RETAIL or PRIME) and the basis for that determination |
| `IdentityBindingClaim` | Binds user identity (hashed userId + optional wallet address) to the proof |

This replaces the V1/V2 `AccreditedInvestorClaim` model and removes all removed claims (`JurisdictionClaim`, `KycApprovedClaim`, boolean flags). The tier determination is performed by a **`TierRulesEngine`** that evaluates financial data against configurable thresholds — rules are env-var-driven, not hardcoded.

### Module Architecture

The single V2 `EligibilityProofModule` is split into two well-scoped modules:

- **`EligibilityModule`** — owns the full tier lifecycle: data ingestion, rules evaluation, profile management, REST API, investment gating.
- **`EligibilityProofModule`** — narrow ZK responsibility: generates and verifies Stellar `ManageData` proofs by consuming an `EligibilityProfile` from `EligibilityModule`.

### Legal Framing

> BuildVest's investor tier system is a **platform product feature**, not a regulatory determination. Analogous to Robinhood Gold or Interactive Brokers Professional tier, the PRIME designation reflects BuildVest's own platform-defined assessment of an investor's financial profile. It does not constitute a formal accreditation under Nigerian SEC, CAMA, or any other regulatory framework. Users are solely responsible for ensuring their own regulatory compliance.

All ZK claim payloads carry explicit metadata echoing this framing.

---

## 2. Codebase Findings

### 2.1 Backend Architecture Map

```
buildvest-backend/
├── src/
│   ├── app.module.ts                    # Root module — wire point for EligibilityModule
│   ├── config/
│   │   └── configuration.ts             # Typed config: stellar.primeRequiredAssetTypes, stellar.primeMinAmount
│   ├── investments/
│   │   ├── investments.module.ts
│   │   ├── investments.service.ts        # Step 3.5 gating: isPrimeRequired() + resolveInvestorTier()
│   │   └── dto/
│   ├── kyc/
│   │   ├── kyc.module.ts
│   │   └── kyc.service.ts               # KYC status check (separate from tier, must be APPROVED)
│   ├── users/
│   │   ├── users.module.ts
│   │   └── users.service.ts
│   ├── eligibility/                     # NEW — EligibilityModule
│   │   ├── eligibility.module.ts
│   │   ├── eligibility.service.ts       # TierRulesEngine, resolveInvestorTier, isPrimeRequired
│   │   ├── eligibility.controller.ts    # 9 REST endpoints
│   │   ├── tier-rules.engine.ts         # TierRulesEngine class
│   │   ├── providers/
│   │   │   ├── eligibility-provider.interface.ts
│   │   │   ├── mock-eligibility.provider.ts
│   │   │   └── mono-eligibility.provider.ts  # Phase B placeholder
│   │   ├── dto/
│   │   │   ├── apply-eligibility.dto.ts
│   │   │   ├── submit-eligibility.dto.ts
│   │   │   └── admin-review.dto.ts
│   │   └── claims/
│   │       └── eligibility-claims.types.ts   # FinancialEligibilityClaim, IdentityBindingClaim
│   ├── eligibility-proof/               # NEW — EligibilityProofModule
│   │   ├── eligibility-proof.module.ts
│   │   ├── eligibility-proof.service.ts # ZK proof orchestration
│   │   └── providers/
│   │       ├── stellar-zk.provider.ts   # Stellar ManageData tx
│   │       └── mock-zk.provider.ts      # Hackathon mock
│   └── prisma/
│       └── prisma.service.ts
├── prisma/
│   └── schema.prisma                    # EligibilityProfile model, InvestorTier enum
└── docs/
    ├── Stellar_ZK_Proofs.md             # This document
    └── Stellar_ZK_Proofs_Execution.md   # Step-by-step execution plan
```

### 2.2 Frontend Architecture Map (Reference)

```
buildvest-frontend/
├── src/
│   ├── pages/
│   │   └── settings/
│   │       └── InvestorSettings.tsx     # "Eligibility Tier" section (was "Eligibility Proof")
│   ├── components/
│   │   ├── EligibilityTierBadge.tsx     # RETAIL / PRIME badge display
│   │   └── EligibilityTierStatus.tsx    # Application status, expiry, renewal prompt
│   └── api/
│       └── eligibility.ts              # /api/v1/eligibility/* client calls
```

### 2.3 Existing Integration Points

| Area | File | Current State | Integration Point |
|------|------|---------------|-------------------|
| Investments | `investments.service.ts` | No tier check | Add step 3.5: `isPrimeRequired()` guard |
| KYC | `kyc.service.ts` | Dojah integration live | Prerequisite gate before tier application |
| Config | `configuration.ts` | Stellar fields absent | Add `primeRequiredAssetTypes`, `primeMinAmount` |
| Prisma | `schema.prisma` | No eligibility model | Add `EligibilityProfile`, enums |
| AppModule | `app.module.ts` | Clean | Import `EligibilityModule`, `EligibilityProofModule` |

### 2.4 Key Observations

1. **KYC is independent.** The existing `KycService` and `KycModule` remain untouched. Tier application requires KYC to be `APPROVED`, but the KYC module is not modified.
2. **No wallet provisioning today.** `IdentityBindingClaim.walletAddress` will be `undefined` for all MVP users. The field is present for forward compatibility with Phase 5 wallet provisioning.
3. **Investments service is the correct gating point.** The `createInvestment` flow in `InvestmentsService` is where tier gating belongs — not at the HTTP layer — because tier requirements are asset-type and amount dependent.
4. **Config is typed.** The project uses `@nestjs/config` with a typed `configuration.ts` factory. New Stellar fields follow the same pattern.

---

## 3. Risk Map

| ID | Risk | Severity | Likelihood | Mitigation |
|----|------|----------|------------|------------|
| R1 | Regulators interpret "PRIME tier" as a formal "accredited investor" determination | HIGH | MEDIUM | Explicit ToS language; claim payload carries `"NOT a regulatory determination"` framing; legal review before launch |
| R2 | Rules engine thresholds miscalibrated for Nigerian market conditions | HIGH | MEDIUM | Thresholds entirely env-var-driven (`STELLAR_PRIME_MIN_AMOUNT`, monthly balance floor); tunable without code deploy |
| R3 | Users gaming system with temporary balance inflation | MEDIUM | HIGH | 6-month rolling evaluation window; `TierRulesEngine` checks 4-of-6 months, not snapshot |
| R4 | Mono API (financial data) unavailable or rate-limited | MEDIUM | MEDIUM | `MockEligibilityProvider` is default in non-prod; graceful degradation to `RETAIL` tier on provider error |
| R5 | Stellar network unavailable during investment creation | MEDIUM | LOW | ZK proof generation is async and optional; `zkProofId` nullable; investment proceeds without proof |
| R6 | Tier expiry UX cliff — user unaware tier has lapsed | HIGH | MEDIUM | 30-day advance email notification; grace period logic in `resolveInvestorTier()`; dashboard renewal prompt |
| R7 | Mock provider creates false confidence in production readiness | LOW | HIGH | `provider: 'mock'` flag in claim metadata; `ELIGIBILITY_PROVIDER=mock` env var blocks production deploy guard |
| R8 | EligibilityModule and EligibilityProofModule circular dependency | LOW | LOW | `EligibilityProofModule` depends on `EligibilityModule` (one direction); no reverse dependency; enforced by module boundary |
| R9 | `FinancialEligibilityClaim` JSON payload tampered on Stellar | LOW | LOW | Horizon API `ManageData` entries are immutable once written by the account keypair; additional HMAC in proof metadata |
| R10 | PII leakage via ZK claim payload | MEDIUM | LOW | Claim carries `userIdHash` (SHA-256), not raw `userId`; no name, email, or bank account numbers in claim |

---

## 4. Recommended Minimal Architecture

### 4.1 End-to-End Flow Diagram

```
User submits investment request
        │
        ▼
InvestmentsService.createInvestment(dto, userId)
        │
        ├─── 1. Basic validation (amount, asset exists, project status)
        │
        ├─── 2. KYC gate ──────────────────────────────────────────────────┐
        │         KycService.getStatus(userId)                             │
        │         status !== 'APPROVED' → throw ForbiddenException         │
        │                                                                  │
        ├─── 3. Fetch asset details                                        │
        │                                                                  │
        ├─── 3.5 TIER ELIGIBILITY CHECK ◄─────────────────────────────────┘
        │         EligibilityService.isPrimeRequired(asset, amount)
        │                  │
        │                  ├─ false → proceed (RETAIL access)
        │                  │
        │                  └─ true  → resolveInvestorTier(userId)
        │                                │
        │                                ├─ PRIME  → proceed
        │                                │
        │                                └─ RETAIL → throw ForbiddenException
        │                                            ("PRIME tier required")
        │
        ├─── 4. Create investment record
        │
        ├─── 5. [ASYNC] EligibilityProofService.generateProof(userId)
        │         │
        │         └─── EligibilityProfile loaded from EligibilityModule
        │               │
        │               └─── Build FinancialEligibilityClaim + IdentityBindingClaim
        │                     │
        │                     └─── StellarZkProvider.writeProof(claims)
        │                               │
        │                               └─── Stellar ManageData transaction
        │
        └─── 6. Return investment response (proofId nullable)
```

### 4.2 Eligibility Verification Lifecycle

```
KYC Status = APPROVED (Dojah — prerequisite, unmodified)
        │
        ▼
POST /api/v1/eligibility/apply
        │  User opts in, initiates application
        ▼
EligibilityProfile created  (status: APPLICATION_STARTED)
        │
        ▼
POST /api/v1/eligibility/submit
        │  User submits consent for financial data access
        ▼
EligibilityProviderInterface.fetchFinancialData(userId)
        │
        ├─── MockEligibilityProvider  (hackathon / non-prod)
        └─── MonoEligibilityProvider  (Phase B production)
        │
        ▼
TierRulesEngine.evaluate(financialData)
        │
        ├─ Path 1: Avg monthly balance ≥ ₦5M for 4 of 6 months → PRIME
        ├─ Path 2: Total annual cash flow ≥ ₦20M              → PRIME
        └─ Neither                                             → RETAIL
        │
        ├─── PRIME  → EligibilityProfile.status = APPROVED, tier = PRIME
        │             expiresAt = now + 365 days
        │             [ASYNC] Generate ZK proof → zkProofId
        │
        └─── RETAIL → EligibilityProfile.status = REJECTED, tier = RETAIL
                      retryAfter = now + 30 days
        │
        ▼
POST /api/v1/eligibility/renew  (annual renewal, 30-day advance prompt)
```

### 4.3 Integration Chain

```
AppModule
  ├── EligibilityModule          (exports EligibilityService)
  │     ├── EligibilityController
  │     ├── EligibilityService    ← isPrimeRequired, resolveInvestorTier, TierRulesEngine
  │     ├── TierRulesEngine
  │     └── Providers
  │           ├── MockEligibilityProvider
  │           └── MonoEligibilityProvider (Phase B)
  │
  ├── EligibilityProofModule      (imports EligibilityModule)
  │     ├── EligibilityProofService
  │     └── Providers
  │           ├── MockZkProvider  (hackathon)
  │           └── StellarZkProvider
  │
  ├── InvestmentsModule           (imports EligibilityModule)
  │     └── InvestmentsService    ← injects EligibilityService
  │
  └── KycModule                   (unchanged)
```

### 4.4 Provider Interface Pattern

```typescript
// eligibility/providers/eligibility-provider.interface.ts
export interface FinancialDataSnapshot {
  userId: number;
  monthlyBalances: { month: string; averageBalance: number }[];
  annualCashFlow: number;
  currency: 'NGN';
  fetchedAt: string;
  provider: 'mock' | 'mono';
}

export interface EligibilityProviderInterface {
  fetchFinancialData(userId: number): Promise<FinancialDataSnapshot>;
}

export const ELIGIBILITY_PROVIDER = Symbol('ELIGIBILITY_PROVIDER');
```

This pattern decouples the rules engine from the data source. Swapping `MockEligibilityProvider` for `MonoEligibilityProvider` in Phase B requires zero changes to `TierRulesEngine` or `EligibilityService`.

---

## 5. Design Refinement — Self-Critique

### Axis 1: Tier Model Purity

**V1/V2 problem:** The old `AccreditedInvestorClaim` with `accredited: boolean` was a binary pass/fail that mirrored US SEC accreditation language. This created regulatory exposure and ignored the nuance of Nigerian financial profiles.

**V3 resolution:** Two named tiers — `RETAIL` and `PRIME` — that are explicitly BuildVest platform concepts. RETAIL is the default (everyone starts here). PRIME is earned through financial verification. Both are legitimate — RETAIL investors get full access to standard assets. This framing is analogous to Robinhood Gold (premium feature tier) or Interactive Brokers Professional (self-declared tier with platform consequences).

**Why not three tiers (RETAIL / PRIME / INSTITUTIONAL)?**

INSTITUTIONAL is explicitly deferred for MVP. Adding a third tier now would:
- Triple the rules engine complexity (three evaluation paths).
- Require corporate entity verification logic that Mono does not support.
- Create edge cases in the investment gating flow.
- Introduce undefined UX states in the frontend badge.

INSTITUTIONAL can be added as `InvestorTier.INSTITUTIONAL` in a future schema migration without breaking existing RETAIL/PRIME logic.

### Axis 2: Asset Gating Model

**V1/V2 problem:** `shouldVerify()` was a boolean that considered only the investment amount. This missed the asset-type dimension: a ₦500,000 investment in a cross-border SPV has different regulatory implications than a ₦5,000,000 investment in a domestic REIT.

**V3 resolution:** `isPrimeRequired(asset, amount)` checks two independent conditions:
1. Asset type is in `STELLAR_PRIME_REQUIRED_ASSET_TYPES` (config-driven).
2. Investment amount exceeds `STELLAR_PRIME_MIN_AMOUNT` (config-driven).

Either condition alone triggers PRIME requirement. Both conditions are independently configurable without code changes.

```typescript
isPrimeRequired(
  asset: { assetType: string; fundingTarget: number },
  investmentAmount: number,
): boolean {
  const gatedTypes = this.config.get<string[]>(
    'app.providers.stellar.primeRequiredAssetTypes',
    [],
  );
  const minAmount = this.config.get<number>(
    'app.providers.stellar.primeMinAmount',
    0,
  );
  return (
    gatedTypes.includes(asset.assetType) ||
    investmentAmount >= minAmount
  );
}
```

### Axis 3: Claim Model Simplification

**V1/V2 problem:** The V2 claim set included `JurisdictionClaim`, `KycApprovedClaim`, `LIQUIDITY_THRESHOLD_MET` boolean, and `FINANCIAL_DATA_VERIFIED` boolean. This bloated the ZK payload, introduced overlap with existing services (KYC status is already tracked by `KycService`), and created maintenance surface for claims that added no unique proof value.

**V3 resolution:** Exactly two claim types.

**`FinancialEligibilityClaim`** — the core proof:

```typescript
export type InvestorTier = 'RETAIL' | 'PRIME';

export type TierBasis =
  | 'DEFAULT'             // RETAIL — no verification performed
  | 'LIQUIDITY_ANALYSIS'  // PRIME via monthly balance path
  | 'DOCUMENT_REVIEW'     // PRIME via document submission
  | 'HYBRID';             // PRIME via both paths

export interface FinancialEligibilityClaim {
  type: 'FINANCIAL_ELIGIBILITY';
  tier: InvestorTier;
  basis: TierBasis;
  verifiedAt: string;   // ISO 8601
  validUntil: string;   // ISO 8601, +365 days for PRIME
  platformNote: string; // Legal framing string
}
```

**`IdentityBindingClaim`** — the binding:

```typescript
export interface IdentityBindingClaim {
  type: 'IDENTITY_BINDING';
  userIdHash: string;        // SHA-256(userId.toString())
  walletAddress?: string;    // Undefined in MVP; Phase 5 wallet provisioning
  chain?: 'solana' | 'stellar';
}
```

**Removed claims and why:**

| Removed Claim | Reason |
|---------------|--------|
| `JurisdictionClaim` | Stays as inline service-level check; no ZK proof value |
| `KycApprovedClaim` | KYC is a prerequisite gate, not a ZK claim; `KycService` already tracks it |
| `LIQUIDITY_THRESHOLD_MET` | Replaced by `tier: PRIME` with `basis: LIQUIDITY_ANALYSIS` |
| `FINANCIAL_DATA_VERIFIED` | Redundant with `basis` field; adds no independent proof |

**Why keep `IdentityBindingClaim` separate from `FinancialEligibilityClaim`?**

In Phase 5 (wallet provisioning), a user's wallet address may change independently of their PRIME status. Keeping identity binding as a separate claim allows the wallet binding to be updated without re-verifying the financial eligibility. The two claims can also be written to separate `ManageData` keys on the Stellar account.

---

## 6. Proposed File-Level Change Plan

### 6.1 New Files (EligibilityModule)

```
src/eligibility/
├── eligibility.module.ts
├── eligibility.service.ts
├── eligibility.controller.ts
├── tier-rules.engine.ts
├── providers/
│   ├── eligibility-provider.interface.ts
│   ├── mock-eligibility.provider.ts
│   └── mono-eligibility.provider.ts       # Phase B placeholder
├── dto/
│   ├── apply-eligibility.dto.ts
│   ├── submit-eligibility.dto.ts
│   └── admin-review.dto.ts
└── claims/
    └── eligibility-claims.types.ts
```

### 6.2 New Files (EligibilityProofModule)

```
src/eligibility-proof/
├── eligibility-proof.module.ts
├── eligibility-proof.service.ts
└── providers/
    ├── zk-provider.interface.ts
    ├── mock-zk.provider.ts
    └── stellar-zk.provider.ts
```

### 6.3 Modified Files

| File | Change |
|------|--------|
| `src/app.module.ts` | Import `EligibilityModule`, `EligibilityProofModule` |
| `src/config/configuration.ts` | Add `stellar.primeRequiredAssetTypes`, `stellar.primeMinAmount` |
| `src/investments/investments.service.ts` | Add step 3.5 tier gating (inject `EligibilityService`) |
| `src/investments/investments.module.ts` | Import `EligibilityModule` |
| `prisma/schema.prisma` | Add `EligibilityProfile` model, `InvestorTier`, `TierVerificationStatus`, `TierBasis` enums |

### 6.4 Unchanged Files

| File | Reason unchanged |
|------|-----------------|
| `src/kyc/*` | KYC is a prerequisite gate; module is not modified |
| `src/users/*` | User model not changed for MVP |
| `src/auth/*` | Auth is not involved in tier determination |
| All other existing modules | Isolated change surface |

### 6.5 File Naming Rationale

- `eligibility/` (not `accreditation/`) — platform-framed language.
- `tier-rules.engine.ts` — clearly communicates this is a rules evaluation engine, not a policy enforcement module.
- `eligibility-proof/` (separate from `eligibility/`) — enforces the module boundary: ZK proof generation is not tier lifecycle management.

---

## 7. Prisma / Data Model Recommendation

### 7.1 New Enums

```prisma
enum InvestorTier {
  RETAIL
  PRIME
}

enum TierVerificationStatus {
  APPLICATION_STARTED
  UNDER_REVIEW
  APPROVED
  REJECTED
  EXPIRED
}

enum TierBasis {
  LIQUIDITY_ANALYSIS
  DOCUMENT_REVIEW
  HYBRID
}
```

### 7.2 EligibilityProfile Model

```prisma
model EligibilityProfile {
  id                   String                 @id @default(uuid())
  userId               Int                    @unique
  user                 User                   @relation(fields: [userId], references: [id])
  tier                 InvestorTier           @default(RETAIL)
  status               TierVerificationStatus @default(APPLICATION_STARTED)
  basis                TierBasis?
  verifiedAt           DateTime?
  expiresAt            DateTime?
  zkProofId            String?
  zkProofGeneratedAt   DateTime?
  applicationData      Json?
  rejectionReason      String?
  reviewedBy           String?
  retryAfter           DateTime?
  createdAt            DateTime               @default(now())
  updatedAt            DateTime               @updatedAt

  @@index([userId])
  @@index([status])
  @@index([expiresAt])
}
```

### 7.3 Tier Resolution Logic

```typescript
resolveInvestorTier(profile: EligibilityProfile | null): InvestorTier {
  if (!profile) return 'RETAIL';
  if (profile.status !== 'APPROVED') return 'RETAIL';
  if (profile.expiresAt && profile.expiresAt <= new Date()) return 'RETAIL';
  return profile.tier as InvestorTier; // PRIME
}
```

**Invariants:**
- Every user who does not have an `EligibilityProfile` is RETAIL. No profile = no risk.
- A REJECTED or EXPIRED profile resolves to RETAIL, not an error. The investment flow is never blocked by a missing or stale profile — only by actively requiring PRIME for a specific asset.
- `expiresAt` check uses `<=` (not `<`) to handle clock skew on exact-second boundaries.

### 7.4 Migration Strategy

```bash
# 1. Generate migration
npx prisma migrate dev --name add_eligibility_profile

# 2. No backfill needed — existing users have no EligibilityProfile
#    resolveInvestorTier(null) returns RETAIL safely

# 3. Verify
npx prisma studio
```

**No destructive changes.** The migration only adds new tables and enums. Zero impact on existing `User`, `Investment`, `KycProfile`, or any other model.

### 7.5 Data Retention

- `applicationData` (Json) stores raw financial data snapshot used for evaluation. This field should be encrypted at rest in production (Phase B).
- `rejectionReason` is a platform-facing field; it is surfaced to users only in a sanitised form via the API.
- `reviewedBy` stores admin user identifier for audit trail.

---

## 8. Frontend Integration Recommendation

### 8.1 InvestorSettings.tsx — Eligibility Tier Section

The V2 "Eligibility Proof" section in `InvestorSettings.tsx` is renamed to **"Eligibility Tier"** in V3.

```tsx
// InvestorSettings.tsx (updated section)
<Section title="Eligibility Tier">
  <EligibilityTierBadge tier={eligibilityData?.tier ?? 'RETAIL'} />
  <EligibilityTierStatus
    status={eligibilityData?.status}
    expiresAt={eligibilityData?.expiresAt}
    retryAfter={eligibilityData?.retryAfter}
  />
  {eligibilityData?.status === 'APPROVED' && eligibilityData?.zkProofId && (
    <ZkProofLink proofId={eligibilityData.zkProofId} />
  )}
  <EligibilityTierActions status={eligibilityData?.status} />
</Section>
```

### 8.2 EligibilityTierBadge Component

```tsx
// components/EligibilityTierBadge.tsx
interface Props { tier: 'RETAIL' | 'PRIME'; }

export const EligibilityTierBadge: React.FC<Props> = ({ tier }) => (
  <span className={`badge badge--${tier.toLowerCase()}`}>
    {tier === 'PRIME' ? '⭐ PRIME Investor' : 'RETAIL Investor'}
  </span>
);
```

### 8.3 API Client

```typescript
// api/eligibility.ts
export const eligibilityApi = {
  apply: () => apiClient.post('/api/v1/eligibility/apply'),
  getStatus: () => apiClient.get('/api/v1/eligibility/status'),
  submit: (data: SubmitEligibilityDto) =>
    apiClient.post('/api/v1/eligibility/submit', data),
  getProof: () => apiClient.get('/api/v1/eligibility/proof'),
  renew: () => apiClient.post('/api/v1/eligibility/renew'),
};
```

### 8.4 UX States

| Profile State | Badge | CTA |
|---------------|-------|-----|
| No profile | RETAIL | "Apply for PRIME" |
| APPLICATION_STARTED | RETAIL | "Continue application" |
| UNDER_REVIEW | RETAIL | "Under review" (disabled) |
| APPROVED (valid) | PRIME | "View proof" / "Renew" (if <30 days to expiry) |
| APPROVED (expiring) | PRIME ⚠️ | "Renew now" |
| REJECTED | RETAIL | "Reapply" (after retryAfter) |
| EXPIRED | RETAIL | "Renew" |

### 8.5 Tier Expiry Notification

The frontend should poll `GET /api/v1/eligibility/status` and display a renewal banner if:
```typescript
const daysUntilExpiry = differenceInDays(new Date(profile.expiresAt), new Date());
if (daysUntilExpiry <= 30) showRenewalBanner();
```

A backend cron job (Phase B) handles email notifications independently.

---

## 9. Backend Integration Recommendation

### 9.1 EligibilityService Core Methods

```typescript
@Injectable()
export class EligibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(ELIGIBILITY_PROVIDER)
    private readonly provider: EligibilityProviderInterface,
    private readonly rulesEngine: TierRulesEngine,
  ) {}

  async isPrimeRequired(
    asset: { assetType: string; fundingTarget: number },
    investmentAmount: number,
  ): Promise<boolean> {
    const gatedTypes = this.config.get<string[]>(
      'app.providers.stellar.primeRequiredAssetTypes', [],
    );
    const minAmount = this.config.get<number>(
      'app.providers.stellar.primeMinAmount', 0,
    );
    return gatedTypes.includes(asset.assetType) || investmentAmount >= minAmount;
  }

  async resolveInvestorTier(userId: number): Promise<InvestorTier> {
    const profile = await this.prisma.eligibilityProfile.findUnique({
      where: { userId },
    });
    return this.resolveFromProfile(profile);
  }

  private resolveFromProfile(profile: EligibilityProfile | null): InvestorTier {
    if (!profile) return 'RETAIL';
    if (profile.status !== 'APPROVED') return 'RETAIL';
    if (profile.expiresAt && profile.expiresAt <= new Date()) return 'RETAIL';
    return profile.tier as InvestorTier;
  }

  async buildClaims(userId: number): Promise<[FinancialEligibilityClaim, IdentityBindingClaim]> {
    const profile = await this.prisma.eligibilityProfile.findUniqueOrThrow({
      where: { userId },
    });
    const tier = this.resolveFromProfile(profile);

    const financialClaim: FinancialEligibilityClaim = {
      type: 'FINANCIAL_ELIGIBILITY',
      tier,
      basis: (profile.basis as TierBasis) ?? 'DEFAULT',
      verifiedAt: profile.verifiedAt?.toISOString() ?? new Date().toISOString(),
      validUntil: profile.expiresAt?.toISOString() ?? new Date().toISOString(),
      platformNote:
        "These claims represent BuildVest's PLATFORM-DEFINED eligibility assessment. " +
        'They are NOT regulatory determinations.',
    };

    const identityClaim: IdentityBindingClaim = {
      type: 'IDENTITY_BINDING',
      userIdHash: createHash('sha256').update(userId.toString()).digest('hex'),
    };

    return [financialClaim, identityClaim];
  }
}
```

### 9.2 TierRulesEngine

```typescript
@Injectable()
export class TierRulesEngine {
  private readonly monthlyBalanceFloor: number;
  private readonly monthlyBalanceMonths: number;
  private readonly annualCashFlowFloor: number;
  readonly rulesVersion = '1.0.0';

  constructor(private readonly config: ConfigService) {
    this.monthlyBalanceFloor = this.config.get<number>(
      'app.eligibility.monthlyBalanceFloor', 5_000_000,  // ₦5M
    );
    this.monthlyBalanceMonths = this.config.get<number>(
      'app.eligibility.monthlyBalanceMonths', 4,          // 4 of 6 months
    );
    this.annualCashFlowFloor = this.config.get<number>(
      'app.eligibility.annualCashFlowFloor', 20_000_000, // ₦20M
    );
  }

  evaluate(snapshot: FinancialDataSnapshot): { tier: InvestorTier; basis: TierBasis | 'DEFAULT' } {
    const recentMonths = snapshot.monthlyBalances.slice(-6);
    const qualifyingMonths = recentMonths.filter(
      (m) => m.averageBalance >= this.monthlyBalanceFloor,
    ).length;

    const liquidityPath = qualifyingMonths >= this.monthlyBalanceMonths;
    const cashFlowPath = snapshot.annualCashFlow >= this.annualCashFlowFloor;

    if (liquidityPath && cashFlowPath) return { tier: 'PRIME', basis: 'HYBRID' };
    if (liquidityPath) return { tier: 'PRIME', basis: 'LIQUIDITY_ANALYSIS' };
    if (cashFlowPath) return { tier: 'PRIME', basis: 'LIQUIDITY_ANALYSIS' };
    return { tier: 'RETAIL', basis: 'DEFAULT' };
  }
}
```

### 9.3 InvestmentsService — Step 3.5

```typescript
// investments.service.ts — createInvestment method (updated step 3.5)
async createInvestment(dto: CreateInvestmentDto, userId: number) {
  // Step 1: Basic validation
  const asset = await this.prisma.asset.findUniqueOrThrow({ where: { id: dto.assetId } });

  // Step 2: KYC gate
  const kycStatus = await this.kycService.getStatus(userId);
  if (kycStatus !== 'APPROVED') {
    throw new ForbiddenException('KYC verification required before investing');
  }

  // Step 3.5: Tier eligibility check
  const requiresPrime = await this.eligibilityService.isPrimeRequired(
    { assetType: asset.assetType, fundingTarget: asset.fundingTarget },
    dto.amount,
  );
  if (requiresPrime) {
    const tier = await this.eligibilityService.resolveInvestorTier(userId);
    if (tier !== 'PRIME') {
      throw new ForbiddenException(
        'This investment requires PRIME investor tier. ' +
        'Please complete eligibility verification in your account settings.',
      );
    }
  }

  // Step 4: Create investment
  const investment = await this.prisma.investment.create({ data: { ...dto, userId } });

  // Step 5: Async ZK proof (fire-and-forget, non-blocking)
  this.eligibilityProofService
    .generateProof(userId)
    .catch((err) => this.logger.warn('ZK proof generation failed (non-blocking)', err));

  return investment;
}
```

### 9.4 REST API Endpoints

```typescript
// eligibility.controller.ts
@Controller('api/v1/eligibility')
@UseGuards(JwtAuthGuard)
export class EligibilityController {
  @Post('apply')
  apply(@Request() req): Promise<EligibilityProfile>

  @Get('status')
  getStatus(@Request() req): Promise<EligibilityStatusDto>

  @Post('submit')
  submit(@Request() req, @Body() dto: SubmitEligibilityDto): Promise<EligibilityProfile>

  @Get('proof')
  getProof(@Request() req): Promise<ZkProofDto>

  @Post('renew')
  renew(@Request() req): Promise<EligibilityProfile>
}

@Controller('api/v1/admin/eligibility')
@UseGuards(JwtAuthGuard, AdminGuard)
export class EligibilityAdminController {
  @Get()
  listAll(@Query() query: PaginationQuery): Promise<PaginatedResult<EligibilityProfile>>

  @Get('rules')
  getRules(): Promise<RulesConfigDto>

  @Get(':id')
  getOne(@Param('id') id: string): Promise<EligibilityProfile>

  @Patch(':id')
  review(@Param('id') id: string, @Body() dto: AdminReviewDto): Promise<EligibilityProfile>
}
```

---

## 10. Feature Flag Strategy

### 10.1 Environment Variables

```bash
# Eligibility feature toggle
ELIGIBILITY_ENABLED=true           # Master switch — false disables all gating
ELIGIBILITY_PROVIDER=mock          # 'mock' | 'mono' — blocks prod deploy if 'mock'

# Tier gating configuration
STELLAR_PRIME_REQUIRED_ASSET_TYPES=SPV,CROSS_BORDER_REIT
STELLAR_PRIME_MIN_AMOUNT=10000000  # ₦10M investment threshold

# Rules engine thresholds (all configurable without code deploy)
ELIGIBILITY_MONTHLY_BALANCE_FLOOR=5000000    # ₦5M
ELIGIBILITY_MONTHLY_BALANCE_MONTHS=4         # 4 of 6 months
ELIGIBILITY_ANNUAL_CASH_FLOW_FLOOR=20000000  # ₦20M

# ZK proof toggle (independent of tier gating)
STELLAR_ZK_PROOF_ENABLED=true
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_ACCOUNT_SECRET=S...

# Tier expiry
ELIGIBILITY_TIER_VALIDITY_DAYS=365
ELIGIBILITY_RENEWAL_REMINDER_DAYS=30
```

### 10.2 Configuration Factory Update

```typescript
// config/configuration.ts (additions)
app: {
  eligibility: {
    enabled: process.env.ELIGIBILITY_ENABLED === 'true',
    provider: process.env.ELIGIBILITY_PROVIDER ?? 'mock',
    monthlyBalanceFloor: parseInt(process.env.ELIGIBILITY_MONTHLY_BALANCE_FLOOR ?? '5000000'),
    monthlyBalanceMonths: parseInt(process.env.ELIGIBILITY_MONTHLY_BALANCE_MONTHS ?? '4'),
    annualCashFlowFloor: parseInt(process.env.ELIGIBILITY_ANNUAL_CASH_FLOW_FLOOR ?? '20000000'),
    tierValidityDays: parseInt(process.env.ELIGIBILITY_TIER_VALIDITY_DAYS ?? '365'),
    renewalReminderDays: parseInt(process.env.ELIGIBILITY_RENEWAL_REMINDER_DAYS ?? '30'),
  },
  providers: {
    stellar: {
      zkProofEnabled: process.env.STELLAR_ZK_PROOF_ENABLED === 'true',
      horizonUrl: process.env.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org',
      accountSecret: process.env.STELLAR_ACCOUNT_SECRET,
      primeRequiredAssetTypes: (process.env.STELLAR_PRIME_REQUIRED_ASSET_TYPES ?? '')
        .split(',')
        .filter(Boolean),
      primeMinAmount: parseInt(process.env.STELLAR_PRIME_MIN_AMOUNT ?? '0'),
    },
  },
},
```

### 10.3 Production Deploy Guard

```typescript
// eligibility.module.ts — onModuleInit guard
async onModuleInit() {
  const provider = this.config.get<string>('app.eligibility.provider');
  const nodeEnv = this.config.get<string>('NODE_ENV');
  if (nodeEnv === 'production' && provider === 'mock') {
    throw new Error(
      'ELIGIBILITY_PROVIDER=mock is not allowed in production. ' +
      'Set ELIGIBILITY_PROVIDER=mono before deploying.',
    );
  }
}
```

---

## 11. Implementation Sequence

### Phase A — Hackathon (~4.5 hours)

| Step | Task | Est. Time |
|------|------|-----------|
| A1 | Prisma schema: `EligibilityProfile`, enums, migrate | 20 min |
| A2 | Config: `primeRequiredAssetTypes`, `primeMinAmount`, eligibility thresholds | 15 min |
| A3 | `eligibility-claims.types.ts`: `FinancialEligibilityClaim`, `IdentityBindingClaim` | 15 min |
| A4 | `EligibilityProviderInterface`, `MockEligibilityProvider` | 20 min |
| A5 | `TierRulesEngine` with env-var thresholds | 30 min |
| A6 | `EligibilityService`: `isPrimeRequired`, `resolveInvestorTier`, `buildClaims` | 45 min |
| A7 | `EligibilityModule` + `EligibilityController` (5 user endpoints) | 30 min |
| A8 | Wire `EligibilityModule` into `AppModule` and `InvestmentsModule` | 15 min |
| A9 | `InvestmentsService` step 3.5 gating | 20 min |
| A10 | `EligibilityProofModule` with `MockZkProvider` | 20 min |
| A11 | Unit tests: `TierRulesEngine`, `EligibilityService`, gating | 30 min |
| A12 | Smoke test end-to-end investment gating flow | 20 min |

**Phase A total: ~4h 20min**

### Phase B — Production (~2–3 weeks)

| Task | Scope |
|------|-------|
| B1 | `MonoEligibilityProvider` — real Mono API integration for financial data |
| B2 | Document extraction pipeline — parse bank statements, extract cash flow |
| B3 | Admin review UI — queue of `UNDER_REVIEW` profiles, approve/reject flow |
| B4 | Renewal cron job — 30-day advance email notifications, `EXPIRED` status updates |
| B5 | Investor eligibility UI — full application flow in `InvestorSettings.tsx` |
| B6 | Configurable thresholds admin panel — update rules via admin UI, not env vars |
| B7 | Real Stellar ZK proofs — `StellarZkProvider` with live `ManageData` transactions |
| B8 | Analytics — tier distribution, conversion rates, renewal rates |
| B9 | Encryption at rest for `applicationData` Json field |
| B10 | Legal review — ToS update, explicit PRIME tier consent language |

---

## 12. Do Not Do List

These items are explicitly out of scope for MVP and should not be implemented regardless of available time.

| ❌ Do Not | Reason |
|-----------|--------|
| Add `INSTITUTIONAL` tier in V1 | Three-tier logic tripling complexity; defer to Phase B |
| Store raw bank statements in `applicationData` | PII risk; store only processed financial snapshots |
| Block investment creation synchronously on ZK proof | ZK is async and optional; investments must not depend on Stellar availability |
| Implement real `StellarZkProvider` before hackathon | `MockZkProvider` is sufficient for hackathon demo; real Stellar in Phase B |
| Modify `KycModule` or `KycService` | KYC is a prerequisite gate only; no changes needed |
| Add eligibility gating to existing investments | Only new investments after feature flag enable; no backfill |
| Use regex parsing for Mono financial data | Use Mono's structured API response; no text parsing |
| Hard-code ₦5M threshold in `TierRulesEngine` | All thresholds must be env-var-driven on day one |
| Put tier logic in the HTTP auth guard | Tier gating is business logic, not authentication; belongs in service layer |
| Create a separate `TierModule` | `TierRulesEngine` belongs in `EligibilityModule`, not a standalone module |

---

## 13. Final Verdict

### What BuildVest gets from V3

1. **Clean product language.** RETAIL/PRIME maps naturally to premium product tiers. No regulatory baggage from "accreditation" language.
2. **Configurable rules.** Every threshold is env-var-driven. The rules version is tracked (`TierRulesEngine.rulesVersion`) for audit purposes.
3. **Privacy-preserving proofs.** The ZK claim reveals tier and basis — not bank balances, not account numbers, not identity. `userIdHash` prevents correlation attacks.
4. **Non-blocking architecture.** Tier check is synchronous (database read). ZK proof generation is async fire-and-forget. Stellar network outages do not block investments.
5. **Module boundary clarity.** `EligibilityModule` owns tier lifecycle. `EligibilityProofModule` owns ZK proof generation. No circular dependencies.
6. **Legal defensibility.** Every claim payload carries the platform-framing note. The language is explicit: this is a platform feature, not a regulatory determination.
7. **Hackathon ready.** Phase A delivers a complete, testable, demo-ready implementation in ~4.5 hours using `MockEligibilityProvider` and `MockZkProvider`.

### Confidence Assessment

| Dimension | Assessment |
|-----------|-----------|
| Architecture soundness | ✅ High — module split is clean, dependency flow is unidirectional |
| Regulatory risk | ⚠️ Medium — platform framing reduces but does not eliminate risk; legal review required before production |
| Implementation feasibility (Phase A) | ✅ High — all dependencies exist, no external API needed for hackathon |
| Production readiness (Phase B) | ⚠️ Medium — Mono API integration and admin review UI are non-trivial |
| ZK proof value proposition | ✅ High — portable, verifiable, privacy-preserving tier proof on Stellar |

---

## 14. Stretch Task — Minimal Hackathon PoC

If the full Phase A scope is too ambitious for the hackathon time box, this minimal PoC delivers a compelling demo:

### Minimal PoC Scope (2 hours)

1. **Schema** — `EligibilityProfile` model with `tier`, `status`, `zkProofId` (skip `basis`, `applicationData`, indexes for speed).
2. **`TierRulesEngine`** — hardcode the ₦5M threshold for the PoC (add env-var config before demo).
3. **`MockEligibilityProvider`** — returns a snapshot that always passes PRIME.
4. **`EligibilityService`** — `isPrimeRequired()` and `resolveInvestorTier()` only (skip `buildClaims` for PoC).
5. **`InvestmentsService` step 3.5** — the gating check with the `ForbiddenException`.
6. **`MockZkProvider`** — returns a fake `proofId` string, no Stellar call.
7. **One test** — verify that a PRIME user can invest in a gated asset, a RETAIL user cannot.

### Demo Script

```
1. Show config: STELLAR_PRIME_REQUIRED_ASSET_TYPES=SPV
2. Create investment for SPV asset as RETAIL user → 403 Forbidden
3. Approve user to PRIME (direct DB update in demo)
4. Create same investment as PRIME user → 201 Created with zkProofId
5. Show EligibilityTierBadge in frontend: "⭐ PRIME Investor"
```

### What this PoC demonstrates

- Investor tier gating is live and functional.
- ZK proof ID is attached to the investment record.
- The frontend badge reflects tier correctly.
- The rules engine is in place (even if threshold is temporarily hardcoded).
- The module architecture is clean and production-scalable.

---

## 15. V1 → V2 → V3 Comparison Table

| Dimension | V1 (Accreditation) | V2 (ZK Proof Layer) | V3 (Investor Tier) |
|-----------|-------------------|--------------------|--------------------|
| **Primary claim** | `AccreditedInvestorClaim { accredited: boolean }` | `AccreditedInvestorClaim` + `JurisdictionClaim` + `KycApprovedClaim` | `FinancialEligibilityClaim { tier, basis }` + `IdentityBindingClaim` |
| **Privacy value** | Low — boolean reveals binary status | Medium — multiple claims, some redundant | High — tier + basis only; no raw data; userIdHash |
| **Product value** | Low — "accredited investor" has no product meaning on platform | Medium — ZK proof exists but not integrated with product tiers | High — RETAIL/PRIME maps to product access directly |
| **Regulatory risk** | HIGH — "accreditation" implies regulatory determination | HIGH — same language | LOW-MEDIUM — "platform tier" with explicit non-regulatory disclaimer |
| **Flexibility** | None — binary flag | Low — hard to add new tiers | High — TierBasis extensible, INSTITUTIONAL deferred cleanly |
| **Schema impact** | Large — `AccreditationProfile` with many boolean fields | Large — same schema + claim tables | Moderate — `EligibilityProfile` with nullable optional fields |
| **Implementation time** | Unknown — no plan | ~6h estimated | ~4.5h (Phase A) / 2-3wk (Phase B) |
| **Hackathon pitch strength** | Weak — "we check if you're accredited" | Medium — "we generate ZK proofs" | Strong — "PRIME investors get access to exclusive deals, verified by ZK" |
| **Production viability** | Low — legal exposure, no product hook | Medium — ZK plumbing exists but product story weak | High — legal framing + product tiers + ZK proof chain |
| **Config-driven rules** | No | No | Yes — all thresholds env-var-driven |
| **Module architecture** | Single module | Single `EligibilityProofModule` | Split: `EligibilityModule` + `EligibilityProofModule` |
| **Provider abstraction** | None | `EligibilityProviderInterface` | `EligibilityProviderInterface` + `MockEligibilityProvider` + `MonoEligibilityProvider` |
