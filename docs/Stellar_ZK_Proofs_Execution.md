# Stellar ZK Investor Tier Proofs — Implementation Execution Roadmap

> **Version:** 2.0
> **Date:** 2026-04-07
> **Status:** ✅ Ready for implementation
> **Scope:** `buildvest-backend` (Steps SZK-1 through SZK-9, SZK-11) + `buildvest-frontend` (Step SZK-10, optional)
> **Companion doc:** [`docs/Stellar_ZK_Proofs.md`](./Stellar_ZK_Proofs.md) — deep codebase analysis and architecture rationale

---

## Changelog

| Version | Date       | Summary                                                                                  |
|---------|------------|------------------------------------------------------------------------------------------|
| 1.0     | 2026-04-07 | Initial execution roadmap — V1 accreditation model                                        |
| 1.1     | 2026-04-07 | V2 refinements: ProofSubject, tiered gating, explicit claim model                         |
| 2.0     | 2026-04-07 | V3 rewrite: investor tier model (RETAIL/PRIME), FinancialEligibilityClaim, EligibilityModule split, TierRulesEngine, config-driven rules |

---

## Design Refinement Reference

> This execution plan implements the V3 architectural design documented in [`docs/Stellar_ZK_Proofs.md`](./Stellar_ZK_Proofs.md). The three V3 refinements are:

1. **Investor Tier Model** — Two platform-defined tiers (`RETAIL`, `PRIME`) replace the V2 accreditation binary. RETAIL is the default for all users. PRIME is earned through financial verification via `TierRulesEngine`.

2. **Config-driven asset gating** — `isPrimeRequired(asset, amount)` replaces `shouldVerify()`. Checks `STELLAR_PRIME_REQUIRED_ASSET_TYPES` and `STELLAR_PRIME_MIN_AMOUNT` env vars. Both conditions are independently configurable without code deploy.

3. **Simplified claim set** — Exactly two claim types: `FinancialEligibilityClaim` (tier + basis) and `IdentityBindingClaim` (userIdHash + optional wallet). All V2 claims (`JurisdictionClaim`, `KycApprovedClaim`, boolean flags) are removed.

---

## Steps Overview

| Step | Name | Complexity | Phase |
|------|------|------------|-------|
| SZK-1 | Config & Environment Setup | Low | A |
| SZK-2 | Prisma Schema | Low | A |
| SZK-3 | EligibilityModule — Interfaces, DTOs, TierRulesEngine | Medium | A |
| SZK-4 | EligibilityModule — MockEligibilityProvider | Low | A |
| SZK-5 | EligibilityModule — EligibilityService | High | A |
| SZK-6 | Wire EligibilityModule — AppModule + REST Endpoints | Medium | A |
| SZK-7 | EligibilityProofModule — ZK Proof Generation | Medium | A |
| SZK-8 | Inject into InvestmentsService — Step 3.5 Gating | Medium | A |
| SZK-9 | StellarZkProvider — Real ManageData Transaction | High | B |
| SZK-10 | Frontend Eligibility Tier Badge (optional) | Low | A |
| SZK-11 | Integration Testing & Documentation | Medium | A |

---

## SZK-1 — Config & Environment Setup

**Complexity:** Low  
**Depends on:** Nothing  
**Repo:** `buildvest-backend`  
**Est. time:** 15 minutes

### SZK-1.1 Environment Variables

Add to `.env` and `.env.example`:

```bash
# ── Eligibility Feature ──────────────────────────────────────────────────────
ELIGIBILITY_ENABLED=true
# 'mock' for hackathon/non-prod; 'mono' for production
# Production deploy guard blocks startup if ELIGIBILITY_PROVIDER=mock and NODE_ENV=production
ELIGIBILITY_PROVIDER=mock

# ── Tier Gating ──────────────────────────────────────────────────────────────
# Comma-separated asset types that require PRIME tier
STELLAR_PRIME_REQUIRED_ASSET_TYPES=SPV,CROSS_BORDER_REIT
# Minimum investment amount (NGN) that requires PRIME tier (0 = amount-based gating disabled)
STELLAR_PRIME_MIN_AMOUNT=10000000

# ── TierRulesEngine Thresholds ────────────────────────────────────────────────
ELIGIBILITY_MONTHLY_BALANCE_FLOOR=5000000
ELIGIBILITY_MONTHLY_BALANCE_MONTHS=4
ELIGIBILITY_ANNUAL_CASH_FLOW_FLOOR=20000000

# ── Tier Lifecycle ────────────────────────────────────────────────────────────
ELIGIBILITY_TIER_VALIDITY_DAYS=365
ELIGIBILITY_RENEWAL_REMINDER_DAYS=30

# ── Stellar ZK Proof ─────────────────────────────────────────────────────────
STELLAR_ZK_PROOF_ENABLED=true
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_ACCOUNT_SECRET=
```

### SZK-1.2 Update `configuration.ts`

Locate `src/config/configuration.ts` (or equivalent) and add the following fields to the `app` config object:

```typescript
// src/config/configuration.ts
export default () => ({
  // ... existing fields ...
  app: {
    // ... existing app fields ...
    eligibility: {
      enabled: process.env.ELIGIBILITY_ENABLED === 'true',
      provider: process.env.ELIGIBILITY_PROVIDER ?? 'mock',
      monthlyBalanceFloor: parseInt(
        process.env.ELIGIBILITY_MONTHLY_BALANCE_FLOOR ?? '5000000', 10,
      ),
      monthlyBalanceMonths: parseInt(
        process.env.ELIGIBILITY_MONTHLY_BALANCE_MONTHS ?? '4', 10,
      ),
      annualCashFlowFloor: parseInt(
        process.env.ELIGIBILITY_ANNUAL_CASH_FLOW_FLOOR ?? '20000000', 10,
      ),
      tierValidityDays: parseInt(
        process.env.ELIGIBILITY_TIER_VALIDITY_DAYS ?? '365', 10,
      ),
      renewalReminderDays: parseInt(
        process.env.ELIGIBILITY_RENEWAL_REMINDER_DAYS ?? '30', 10,
      ),
    },
    providers: {
      // ... existing provider fields ...
      stellar: {
        zkProofEnabled: process.env.STELLAR_ZK_PROOF_ENABLED === 'true',
        horizonUrl:
          process.env.STELLAR_HORIZON_URL ??
          'https://horizon-testnet.stellar.org',
        accountSecret: process.env.STELLAR_ACCOUNT_SECRET,
        primeRequiredAssetTypes: (
          process.env.STELLAR_PRIME_REQUIRED_ASSET_TYPES ?? ''
        )
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        primeMinAmount: parseInt(
          process.env.STELLAR_PRIME_MIN_AMOUNT ?? '0', 10,
        ),
      },
    },
  },
});
```

### SZK-1.3 Deliverables

- `.env` and `.env.example` updated with all new keys.
- `configuration.ts` exports `app.eligibility.*` and `app.providers.stellar.*` (V3 names).

### SZK-1.4 Acceptance Criteria

- `ConfigService.get('app.providers.stellar.primeRequiredAssetTypes')` returns a string array.
- `ConfigService.get('app.eligibility.monthlyBalanceFloor')` returns a number.
- No TypeScript errors in `configuration.ts`.

---

## SZK-2 — Prisma Schema

**Complexity:** Low  
**Depends on:** SZK-1  
**Repo:** `buildvest-backend`  
**Est. time:** 20 minutes

### SZK-2.1 Add Enums to `schema.prisma`

```prisma
// prisma/schema.prisma

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

### SZK-2.2 Add `EligibilityProfile` Model

```prisma
// prisma/schema.prisma

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

### SZK-2.3 Add Relation to `User` Model

```prisma
// prisma/schema.prisma — existing User model, add relation field:

model User {
  // ... existing fields ...
  eligibilityProfile   EligibilityProfile?
}
```

### SZK-2.4 Run Migration

```bash
npx prisma migrate dev --name add_eligibility_profile
npx prisma generate
```

Verify in Prisma Studio:
```bash
npx prisma studio
```

### SZK-2.5 Deliverables

- `EligibilityProfile` model in `schema.prisma`.
- `InvestorTier`, `TierVerificationStatus`, `TierBasis` enums in `schema.prisma`.
- Migration file created and applied.
- `@prisma/client` regenerated with new types.

### SZK-2.6 Acceptance Criteria

- `prisma.eligibilityProfile.findUnique({ where: { userId: 1 } })` compiles without TypeScript errors.
- Migration applies cleanly with `prisma migrate dev`.
- No existing model fields are modified.

---

## SZK-3 — EligibilityModule — Interfaces, DTOs, TierRulesEngine

**Complexity:** Medium  
**Depends on:** SZK-1, SZK-2  
**Repo:** `buildvest-backend`  
**Est. time:** 45 minutes

### SZK-3.1 Create Directory Structure

```bash
mkdir -p src/eligibility/providers
mkdir -p src/eligibility/dto
mkdir -p src/eligibility/claims
```

### SZK-3.2 Claim Types

```typescript
// src/eligibility/claims/eligibility-claims.types.ts

export type InvestorTier = 'RETAIL' | 'PRIME';

export type TierBasis =
  | 'DEFAULT'             // RETAIL — no financial verification performed
  | 'LIQUIDITY_ANALYSIS'  // PRIME via monthly average balance path
  | 'DOCUMENT_REVIEW'     // PRIME via document submission
  | 'HYBRID';             // PRIME via both liquidity + document paths

export interface FinancialEligibilityClaim {
  type: 'FINANCIAL_ELIGIBILITY';
  tier: InvestorTier;
  basis: TierBasis;
  verifiedAt: string;   // ISO 8601
  validUntil: string;   // ISO 8601
  platformNote: string; // Explicit non-regulatory framing
}

export interface IdentityBindingClaim {
  type: 'IDENTITY_BINDING';
  userIdHash: string;        // SHA-256(userId.toString())
  walletAddress?: string;    // Phase 5: undefined in MVP
  chain?: 'solana' | 'stellar';
}

export type EligibilityClaim = FinancialEligibilityClaim | IdentityBindingClaim;

export const PLATFORM_NOTE =
  "These claims represent BuildVest's PLATFORM-DEFINED eligibility assessment. " +
  'They are NOT regulatory determinations under any applicable law or regulation.';
```

### SZK-3.3 Provider Interface

```typescript
// src/eligibility/providers/eligibility-provider.interface.ts

export interface MonthlyBalanceEntry {
  month: string; // YYYY-MM
  averageBalance: number; // NGN
}

export interface FinancialDataSnapshot {
  userId: number;
  monthlyBalances: MonthlyBalanceEntry[]; // Last 6 months minimum
  annualCashFlow: number; // NGN, trailing 12 months
  currency: 'NGN';
  fetchedAt: string; // ISO 8601
  provider: 'mock' | 'mono';
}

export interface EligibilityProviderInterface {
  fetchFinancialData(userId: number): Promise<FinancialDataSnapshot>;
}

export const ELIGIBILITY_PROVIDER = Symbol('ELIGIBILITY_PROVIDER');
```

### SZK-3.4 TierRulesEngine

```typescript
// src/eligibility/tier-rules.engine.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvestorTier, TierBasis } from './claims/eligibility-claims.types';
import { FinancialDataSnapshot } from './providers/eligibility-provider.interface';

export interface TierEvaluation {
  tier: InvestorTier;
  basis: TierBasis;
  qualifyingMonths?: number;
  rulesVersion: string;
}

@Injectable()
export class TierRulesEngine {
  readonly rulesVersion = '1.0.0';

  private readonly monthlyBalanceFloor: number;
  private readonly monthlyBalanceMonths: number;
  private readonly annualCashFlowFloor: number;

  constructor(private readonly config: ConfigService) {
    this.monthlyBalanceFloor = this.config.get<number>(
      'app.eligibility.monthlyBalanceFloor',
      5_000_000,
    );
    this.monthlyBalanceMonths = this.config.get<number>(
      'app.eligibility.monthlyBalanceMonths',
      4,
    );
    this.annualCashFlowFloor = this.config.get<number>(
      'app.eligibility.annualCashFlowFloor',
      20_000_000,
    );
  }

  evaluate(snapshot: FinancialDataSnapshot): TierEvaluation {
    const recentMonths = snapshot.monthlyBalances.slice(-6);
    const qualifyingMonths = recentMonths.filter(
      (m) => m.averageBalance >= this.monthlyBalanceFloor,
    ).length;

    const liquidityPath = qualifyingMonths >= this.monthlyBalanceMonths;
    const cashFlowPath = snapshot.annualCashFlow >= this.annualCashFlowFloor;

    if (liquidityPath && cashFlowPath) {
      return {
        tier: 'PRIME',
        basis: 'HYBRID',
        qualifyingMonths,
        rulesVersion: this.rulesVersion,
      };
    }
    if (liquidityPath) {
      return {
        tier: 'PRIME',
        basis: 'LIQUIDITY_ANALYSIS',
        qualifyingMonths,
        rulesVersion: this.rulesVersion,
      };
    }
    if (cashFlowPath) {
      return {
        tier: 'PRIME',
        basis: 'LIQUIDITY_ANALYSIS',
        qualifyingMonths: 0,
        rulesVersion: this.rulesVersion,
      };
    }
    return {
      tier: 'RETAIL',
      basis: 'DEFAULT',
      qualifyingMonths,
      rulesVersion: this.rulesVersion,
    };
  }
}
```

### SZK-3.5 DTOs

```typescript
// src/eligibility/dto/apply-eligibility.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class ApplyEligibilityDto {
  @IsOptional()
  @IsString()
  consentReference?: string; // Optional reference to consent record
}
```

```typescript
// src/eligibility/dto/submit-eligibility.dto.ts
import { IsEnum, IsOptional } from 'class-validator';
import { TierBasis } from '../claims/eligibility-claims.types';

export class SubmitEligibilityDto {
  @IsEnum(['LIQUIDITY_ANALYSIS', 'DOCUMENT_REVIEW', 'HYBRID'])
  preferredBasis: Exclude<TierBasis, 'DEFAULT'>;

  @IsOptional()
  documentReferences?: string[]; // Phase B: document upload references
}
```

```typescript
// src/eligibility/dto/admin-review.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TierVerificationStatus } from '@prisma/client';

export class AdminReviewDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status: Extract<TierVerificationStatus, 'APPROVED' | 'REJECTED'>;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
```

### SZK-3.6 Deliverables

- `src/eligibility/claims/eligibility-claims.types.ts`
- `src/eligibility/providers/eligibility-provider.interface.ts`
- `src/eligibility/tier-rules.engine.ts`
- `src/eligibility/dto/apply-eligibility.dto.ts`
- `src/eligibility/dto/submit-eligibility.dto.ts`
- `src/eligibility/dto/admin-review.dto.ts`

### SZK-3.7 Acceptance Criteria

- `TierRulesEngine.evaluate()` returns `{ tier: 'PRIME', basis: 'HYBRID' }` when both paths pass.
- `TierRulesEngine.evaluate()` returns `{ tier: 'RETAIL', basis: 'DEFAULT' }` when neither passes.
- All DTOs compile without TypeScript errors.
- `PLATFORM_NOTE` constant is exported for use in `EligibilityService.buildClaims()`.

---

## SZK-4 — EligibilityModule — MockEligibilityProvider

**Complexity:** Low  
**Depends on:** SZK-3  
**Repo:** `buildvest-backend`  
**Est. time:** 20 minutes

### SZK-4.1 MockEligibilityProvider

```typescript
// src/eligibility/providers/mock-eligibility.provider.ts

import { Injectable } from '@nestjs/common';
import {
  EligibilityProviderInterface,
  FinancialDataSnapshot,
} from './eligibility-provider.interface';

/**
 * Mock provider for hackathon and non-production environments.
 * Returns a snapshot that always satisfies PRIME tier rules.
 * The `provider: 'mock'` field in the snapshot surfaces in claim metadata
 * to prevent false confidence in production readiness.
 */
@Injectable()
export class MockEligibilityProvider implements EligibilityProviderInterface {
  async fetchFinancialData(userId: number): Promise<FinancialDataSnapshot> {
    const now = new Date();
    const monthlyBalances = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        averageBalance: 7_500_000, // ₦7.5M — above ₦5M floor
      };
    }).reverse();

    return {
      userId,
      monthlyBalances,
      annualCashFlow: 25_000_000, // ₦25M — above ₦20M floor
      currency: 'NGN',
      fetchedAt: now.toISOString(),
      provider: 'mock',
    };
  }
}
```

### SZK-4.2 MonoEligibilityProvider Placeholder (Phase B)

```typescript
// src/eligibility/providers/mono-eligibility.provider.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EligibilityProviderInterface,
  FinancialDataSnapshot,
} from './eligibility-provider.interface';

/**
 * Phase B: Mono API integration for real financial data.
 * Placeholder — throws NotImplementedException in MVP.
 */
@Injectable()
export class MonoEligibilityProvider implements EligibilityProviderInterface {
  private readonly logger = new Logger(MonoEligibilityProvider.name);

  constructor(private readonly config: ConfigService) {}

  async fetchFinancialData(userId: number): Promise<FinancialDataSnapshot> {
    // Phase B implementation:
    // 1. Resolve Mono account ID for userId from MonoAccount table
    // 2. Call Mono /accounts/{id}/statement?period=last6months
    // 3. Aggregate averageBalance per month
    // 4. Call Mono /accounts/{id}/income for annualCashFlow
    // 5. Return structured FinancialDataSnapshot
    throw new Error(
      'MonoEligibilityProvider is not implemented in Phase A. ' +
      'Set ELIGIBILITY_PROVIDER=mock for hackathon.',
    );
  }
}
```

### SZK-4.3 Deliverables

- `src/eligibility/providers/mock-eligibility.provider.ts`
- `src/eligibility/providers/mono-eligibility.provider.ts` (Phase B placeholder)

### SZK-4.4 Acceptance Criteria

- `MockEligibilityProvider.fetchFinancialData(1)` returns 6 monthly balance entries each at ₦7.5M.
- `MockEligibilityProvider` when evaluated by `TierRulesEngine` produces `{ tier: 'PRIME', basis: 'HYBRID' }`.
- `MonoEligibilityProvider` throws without making any network calls.
- `provider: 'mock'` is present in the returned snapshot.

---

## SZK-5 — EligibilityModule — EligibilityService

**Complexity:** High  
**Depends on:** SZK-2, SZK-3, SZK-4  
**Repo:** `buildvest-backend`  
**Est. time:** 45 minutes

### SZK-5.1 EligibilityService

```typescript
// src/eligibility/eligibility.service.ts

import { createHash } from 'node:crypto';
import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EligibilityProfile, TierVerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  EligibilityProviderInterface,
  ELIGIBILITY_PROVIDER,
} from './providers/eligibility-provider.interface';
import { TierRulesEngine } from './tier-rules.engine';
import {
  EligibilityClaim,
  FinancialEligibilityClaim,
  IdentityBindingClaim,
  InvestorTier,
  PLATFORM_NOTE,
  TierBasis,
} from './claims/eligibility-claims.types';
import { ApplyEligibilityDto } from './dto/apply-eligibility.dto';
import { SubmitEligibilityDto } from './dto/submit-eligibility.dto';
import { AdminReviewDto } from './dto/admin-review.dto';

@Injectable()
export class EligibilityService {
  private readonly logger = new Logger(EligibilityService.name);
  private readonly tierValidityDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(ELIGIBILITY_PROVIDER)
    private readonly provider: EligibilityProviderInterface,
    private readonly rulesEngine: TierRulesEngine,
  ) {
    this.tierValidityDays = this.config.get<number>(
      'app.eligibility.tierValidityDays',
      365,
    );
  }

  // ── Gating ─────────────────────────────────────────────────────────────────

  async isPrimeRequired(
    asset: { assetType: string; fundingTarget: number },
    investmentAmount: number,
  ): Promise<boolean> {
    const gatedTypes = this.config.get<string[]>(
      'app.providers.stellar.primeRequiredAssetTypes',
      [],
    );
    const minAmount = this.config.get<number>(
      'app.providers.stellar.primeMinAmount',
      0,
    );
    return gatedTypes.includes(asset.assetType) || investmentAmount >= minAmount;
  }

  async resolveInvestorTier(userId: number): Promise<InvestorTier> {
    const profile = await this.prisma.eligibilityProfile.findUnique({
      where: { userId },
    });
    return this.resolveFromProfile(profile);
  }

  resolveFromProfile(profile: EligibilityProfile | null): InvestorTier {
    if (!profile) return 'RETAIL';
    if (profile.status !== TierVerificationStatus.APPROVED) return 'RETAIL';
    if (profile.expiresAt && profile.expiresAt <= new Date()) return 'RETAIL';
    return profile.tier as InvestorTier;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async applyForTier(
    userId: number,
    dto: ApplyEligibilityDto,
  ): Promise<EligibilityProfile> {
    const existing = await this.prisma.eligibilityProfile.findUnique({
      where: { userId },
    });
    if (existing && existing.status === TierVerificationStatus.UNDER_REVIEW) {
      throw new ForbiddenException('An application is already under review.');
    }
    if (
      existing &&
      existing.status === TierVerificationStatus.REJECTED &&
      existing.retryAfter &&
      existing.retryAfter > new Date()
    ) {
      throw new ForbiddenException(
        `Cannot reapply until ${existing.retryAfter.toISOString()}.`,
      );
    }

    return this.prisma.eligibilityProfile.upsert({
      where: { userId },
      create: {
        userId,
        tier: 'RETAIL',
        status: TierVerificationStatus.APPLICATION_STARTED,
      },
      update: {
        status: TierVerificationStatus.APPLICATION_STARTED,
        rejectionReason: null,
        retryAfter: null,
      },
    });
  }

  async submitApplication(
    userId: number,
    dto: SubmitEligibilityDto,
  ): Promise<EligibilityProfile> {
    const profile = await this.getProfileOrThrow(userId);

    // Mark as under review
    await this.prisma.eligibilityProfile.update({
      where: { userId },
      data: { status: TierVerificationStatus.UNDER_REVIEW },
    });

    // Fetch financial data and evaluate
    let snapshot;
    try {
      snapshot = await this.provider.fetchFinancialData(userId);
    } catch (err) {
      this.logger.warn(`Financial data fetch failed for user ${userId}`, err);
      // Graceful degradation: remain RETAIL on provider error
      return this.prisma.eligibilityProfile.update({
        where: { userId },
        data: {
          status: TierVerificationStatus.REJECTED,
          rejectionReason: 'Financial data unavailable. Please try again later.',
          retryAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const evaluation = this.rulesEngine.evaluate(snapshot);
    const now = new Date();

    if (evaluation.tier === 'PRIME') {
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + this.tierValidityDays);
      return this.prisma.eligibilityProfile.update({
        where: { userId },
        data: {
          tier: 'PRIME',
          status: TierVerificationStatus.APPROVED,
          basis: evaluation.basis === 'DEFAULT' ? null : (evaluation.basis as any),
          verifiedAt: now,
          expiresAt,
          applicationData: { snapshot, evaluation } as any,
          rejectionReason: null,
          retryAfter: null,
        },
      });
    }

    // RETAIL result
    const retryAfter = new Date(now);
    retryAfter.setDate(retryAfter.getDate() + 30);
    return this.prisma.eligibilityProfile.update({
      where: { userId },
      data: {
        tier: 'RETAIL',
        status: TierVerificationStatus.REJECTED,
        basis: null,
        verifiedAt: null,
        applicationData: { snapshot, evaluation } as any,
        rejectionReason:
          'Financial profile does not meet PRIME tier requirements.',
        retryAfter,
      },
    });
  }

  async renewTier(userId: number): Promise<EligibilityProfile> {
    const profile = await this.getProfileOrThrow(userId);
    if (profile.status !== TierVerificationStatus.APPROVED) {
      throw new ForbiddenException('Only APPROVED profiles can be renewed.');
    }
    return this.submitApplication(userId, {
      preferredBasis: (profile.basis as any) ?? 'LIQUIDITY_ANALYSIS',
    });
  }

  async getStatus(userId: number): Promise<EligibilityProfile | null> {
    return this.prisma.eligibilityProfile.findUnique({ where: { userId } });
  }

  async adminReview(
    profileId: string,
    dto: AdminReviewDto,
    reviewedBy: string,
  ): Promise<EligibilityProfile> {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + this.tierValidityDays);

    return this.prisma.eligibilityProfile.update({
      where: { id: profileId },
      data: {
        status: dto.status as TierVerificationStatus,
        tier: dto.status === 'APPROVED' ? 'PRIME' : 'RETAIL',
        verifiedAt: dto.status === 'APPROVED' ? now : null,
        expiresAt: dto.status === 'APPROVED' ? expiresAt : null,
        rejectionReason: dto.rejectionReason ?? null,
        reviewedBy,
        retryAfter:
          dto.status === 'REJECTED'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : null,
      },
    });
  }

  // ── Claims ─────────────────────────────────────────────────────────────────

  async buildClaims(
    userId: number,
  ): Promise<[FinancialEligibilityClaim, IdentityBindingClaim]> {
    const profile = await this.prisma.eligibilityProfile.findUnique({
      where: { userId },
    });
    const tier = this.resolveFromProfile(profile);

    const financialClaim: FinancialEligibilityClaim = {
      type: 'FINANCIAL_ELIGIBILITY',
      tier,
      basis: (profile?.basis as TierBasis) ?? 'DEFAULT',
      verifiedAt:
        profile?.verifiedAt?.toISOString() ?? new Date().toISOString(),
      validUntil:
        profile?.expiresAt?.toISOString() ?? new Date().toISOString(),
      platformNote: PLATFORM_NOTE,
    };

    const identityClaim: IdentityBindingClaim = {
      type: 'IDENTITY_BINDING',
      userIdHash: createHash('sha256').update(userId.toString()).digest('hex'),
    };

    return [financialClaim, identityClaim];
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async getProfileOrThrow(userId: number): Promise<EligibilityProfile> {
    const profile = await this.prisma.eligibilityProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(
        'No eligibility application found. Please apply first.',
      );
    }
    return profile;
  }
}
```

### SZK-5.2 Deliverables

- `src/eligibility/eligibility.service.ts`

### SZK-5.3 Acceptance Criteria

- `isPrimeRequired({ assetType: 'SPV', fundingTarget: 0 }, 1000)` returns `true` when `STELLAR_PRIME_REQUIRED_ASSET_TYPES=SPV`.
- `resolveInvestorTier(userId)` returns `'RETAIL'` when no profile exists.
- `resolveInvestorTier(userId)` returns `'RETAIL'` when profile is expired.
- `buildClaims(userId)` returns a tuple of `[FinancialEligibilityClaim, IdentityBindingClaim]` where `platformNote` equals `PLATFORM_NOTE`.
- Graceful degradation: `submitApplication` catches provider errors and sets status to `REJECTED`.

---

## SZK-6 — Wire EligibilityModule — AppModule + REST Endpoints

**Complexity:** Medium  
**Depends on:** SZK-3, SZK-4, SZK-5  
**Repo:** `buildvest-backend`  
**Est. time:** 30 minutes

### SZK-6.1 EligibilityController

```typescript
// src/eligibility/eligibility.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { EligibilityService } from './eligibility.service';
import { ApplyEligibilityDto } from './dto/apply-eligibility.dto';
import { SubmitEligibilityDto } from './dto/submit-eligibility.dto';
import { AdminReviewDto } from './dto/admin-review.dto';

@Controller('api/v1/eligibility')
@UseGuards(JwtAuthGuard)
export class EligibilityController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Post('apply')
  apply(@Request() req, @Body() dto: ApplyEligibilityDto) {
    return this.eligibilityService.applyForTier(req.user.id, dto);
  }

  @Get('status')
  getStatus(@Request() req) {
    return this.eligibilityService.getStatus(req.user.id);
  }

  @Post('submit')
  submit(@Request() req, @Body() dto: SubmitEligibilityDto) {
    return this.eligibilityService.submitApplication(req.user.id, dto);
  }

  @Get('proof')
  getProof(@Request() req) {
    return this.eligibilityService.buildClaims(req.user.id);
  }

  @Post('renew')
  renew(@Request() req) {
    return this.eligibilityService.renewTier(req.user.id);
  }
}

@Controller('api/v1/admin/eligibility')
@UseGuards(JwtAuthGuard, AdminGuard)
export class EligibilityAdminController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Get()
  listAll(@Query() query: { page?: number; limit?: number; status?: string }) {
    // Phase B: add filtering/pagination in service layer
    return this.eligibilityService['prisma'].eligibilityProfile.findMany({
      take: query.limit ?? 20,
      skip: ((query.page ?? 1) - 1) * (query.limit ?? 20),
      where: query.status ? { status: query.status as any } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('rules')
  getRules(@Request() req) {
    return {
      rulesVersion: this.eligibilityService['rulesEngine'].rulesVersion,
      description: 'TierRulesEngine thresholds are configurable via environment variables.',
      paths: [
        {
          id: 'LIQUIDITY_ANALYSIS',
          description: 'Average monthly balance >= floor for N of last 6 months',
        },
        {
          id: 'CASH_FLOW',
          description: 'Total annual cash flow >= floor',
        },
      ],
    };
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.eligibilityService['prisma'].eligibilityProfile.findUniqueOrThrow({
      where: { id },
    });
  }

  @Patch(':id')
  review(
    @Param('id') id: string,
    @Body() dto: AdminReviewDto,
    @Request() req,
  ) {
    return this.eligibilityService.adminReview(id, dto, req.user.email);
  }
}
```

### SZK-6.2 EligibilityModule

```typescript
// src/eligibility/eligibility.module.ts

import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { EligibilityService } from './eligibility.service';
import {
  EligibilityController,
  EligibilityAdminController,
} from './eligibility.controller';
import { TierRulesEngine } from './tier-rules.engine';
import { MockEligibilityProvider } from './providers/mock-eligibility.provider';
import { MonoEligibilityProvider } from './providers/mono-eligibility.provider';
import { ELIGIBILITY_PROVIDER } from './providers/eligibility-provider.interface';

@Module({
  imports: [PrismaModule],
  controllers: [EligibilityController, EligibilityAdminController],
  providers: [
    EligibilityService,
    TierRulesEngine,
    {
      provide: ELIGIBILITY_PROVIDER,
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('app.eligibility.provider', 'mock');
        return provider === 'mono'
          ? new MonoEligibilityProvider(config)
          : new MockEligibilityProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [EligibilityService],
})
export class EligibilityModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const provider = this.config.get<string>('app.eligibility.provider');
    const nodeEnv = this.config.get<string>('NODE_ENV');
    if (nodeEnv === 'production' && provider === 'mock') {
      throw new Error(
        'ELIGIBILITY_PROVIDER=mock is not allowed in production. ' +
        'Set ELIGIBILITY_PROVIDER=mono before deploying.',
      );
    }
  }
}
```

### SZK-6.3 Wire into AppModule

```typescript
// src/app.module.ts — add imports:
import { EligibilityModule } from './eligibility/eligibility.module';
import { EligibilityProofModule } from './eligibility-proof/eligibility-proof.module';

@Module({
  imports: [
    // ... existing imports ...
    EligibilityModule,
    EligibilityProofModule,
  ],
})
export class AppModule {}
```

### SZK-6.4 Deliverables

- `src/eligibility/eligibility.controller.ts`
- `src/eligibility/eligibility.module.ts`
- `src/app.module.ts` updated

### SZK-6.5 Acceptance Criteria

- `POST /api/v1/eligibility/apply` returns 201 for authenticated user.
- `GET /api/v1/eligibility/status` returns null (no profile) or profile JSON.
- Module `onModuleInit` throws on `NODE_ENV=production` + `ELIGIBILITY_PROVIDER=mock`.
- `EligibilityModule` exports `EligibilityService` for use by `InvestmentsModule`.

---

## SZK-7 — EligibilityProofModule — ZK Proof Generation

**Complexity:** Medium  
**Depends on:** SZK-5, SZK-6  
**Repo:** `buildvest-backend`  
**Est. time:** 30 minutes

### SZK-7.1 Create Directory Structure

```bash
mkdir -p src/eligibility-proof/providers
```

### SZK-7.2 ZK Provider Interface

```typescript
// src/eligibility-proof/providers/zk-provider.interface.ts

import { EligibilityClaim } from '../../eligibility/claims/eligibility-claims.types';

export interface ZkProofResult {
  proofId: string;
  transactionHash?: string;
  ledger?: number;
  network: 'testnet' | 'mainnet' | 'mock';
  writtenAt: string;
  claimsHash: string; // SHA-256 of serialised claims
}

export interface ZkProviderInterface {
  writeProof(userId: number, claims: EligibilityClaim[]): Promise<ZkProofResult>;
  verifyProof(proofId: string): Promise<boolean>;
}

export const ZK_PROVIDER = Symbol('ZK_PROVIDER');
```

### SZK-7.3 MockZkProvider (Hackathon)

```typescript
// src/eligibility-proof/providers/mock-zk.provider.ts

import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EligibilityClaim } from '../../eligibility/claims/eligibility-claims.types';
import { ZkProviderInterface, ZkProofResult } from './zk-provider.interface';

@Injectable()
export class MockZkProvider implements ZkProviderInterface {
  async writeProof(
    userId: number,
    claims: EligibilityClaim[],
  ): Promise<ZkProofResult> {
    const claimsHash = createHash('sha256')
      .update(JSON.stringify(claims))
      .digest('hex');
    return {
      proofId: `mock-proof-${randomUUID()}`,
      network: 'mock',
      writtenAt: new Date().toISOString(),
      claimsHash,
    };
  }

  async verifyProof(proofId: string): Promise<boolean> {
    return proofId.startsWith('mock-proof-');
  }
}
```

### SZK-7.4 EligibilityProofService

```typescript
// src/eligibility-proof/eligibility-proof.service.ts

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EligibilityService } from '../eligibility/eligibility.service';
import { ZkProviderInterface, ZK_PROVIDER } from './providers/zk-provider.interface';

@Injectable()
export class EligibilityProofService {
  private readonly logger = new Logger(EligibilityProofService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibilityService: EligibilityService,
    @Inject(ZK_PROVIDER) private readonly zkProvider: ZkProviderInterface,
  ) {}

  /**
   * Generate and store a ZK proof for the user's current eligibility state.
   * Non-blocking — callers should fire-and-forget and handle errors gracefully.
   */
  async generateProof(userId: number): Promise<void> {
    const profile = await this.prisma.eligibilityProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      this.logger.debug(`No eligibility profile for user ${userId} — skipping ZK proof`);
      return;
    }

    const claims = await this.eligibilityService.buildClaims(userId);
    const result = await this.zkProvider.writeProof(userId, claims);

    await this.prisma.eligibilityProfile.update({
      where: { userId },
      data: {
        zkProofId: result.proofId,
        zkProofGeneratedAt: new Date(result.writtenAt),
      },
    });

    this.logger.log(
      `ZK proof generated for user ${userId}: ${result.proofId} (${result.network})`,
    );
  }

  async verifyProof(proofId: string): Promise<boolean> {
    return this.zkProvider.verifyProof(proofId);
  }
}
```

### SZK-7.5 EligibilityProofModule

```typescript
// src/eligibility-proof/eligibility-proof.module.ts

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { EligibilityProofService } from './eligibility-proof.service';
import { MockZkProvider } from './providers/mock-zk.provider';
import { StellarZkProvider } from './providers/stellar-zk.provider';
import { ZK_PROVIDER } from './providers/zk-provider.interface';

@Module({
  imports: [PrismaModule, EligibilityModule],
  providers: [
    EligibilityProofService,
    {
      provide: ZK_PROVIDER,
      useFactory: (config: ConfigService) => {
        const enabled = config.get<boolean>(
          'app.providers.stellar.zkProofEnabled',
          false,
        );
        return enabled
          ? new StellarZkProvider(config)
          : new MockZkProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [EligibilityProofService],
})
export class EligibilityProofModule {}
```

### SZK-7.6 Deliverables

- `src/eligibility-proof/providers/zk-provider.interface.ts`
- `src/eligibility-proof/providers/mock-zk.provider.ts`
- `src/eligibility-proof/eligibility-proof.service.ts`
- `src/eligibility-proof/eligibility-proof.module.ts`

### SZK-7.7 Acceptance Criteria

- `EligibilityProofService.generateProof(userId)` writes `zkProofId` to `EligibilityProfile`.
- `MockZkProvider.writeProof()` returns a `proofId` starting with `mock-proof-`.
- `EligibilityProofModule` compiles with no circular dependency warnings.
- `STELLAR_ZK_PROOF_ENABLED=false` (default) uses `MockZkProvider`.

---

## SZK-8 — Inject into InvestmentsService — Step 3.5 Gating

**Complexity:** Medium  
**Depends on:** SZK-5, SZK-6, SZK-7  
**Repo:** `buildvest-backend`  
**Est. time:** 25 minutes

### SZK-8.1 Update InvestmentsModule

```typescript
// src/investments/investments.module.ts

import { Module } from '@nestjs/common';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { EligibilityProofModule } from '../eligibility-proof/eligibility-proof.module';
// ... existing imports ...

@Module({
  imports: [
    // ... existing imports ...
    EligibilityModule,
    EligibilityProofModule,
  ],
  providers: [InvestmentsService],
  controllers: [InvestmentsController],
})
export class InvestmentsModule {}
```

### SZK-8.2 Update InvestmentsService

```typescript
// src/investments/investments.service.ts

import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { EligibilityService } from '../eligibility/eligibility.service';
import { EligibilityProofService } from '../eligibility-proof/eligibility-proof.service';
import { KycService } from '../kyc/kyc.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';

@Injectable()
export class InvestmentsService {
  private readonly logger = new Logger(InvestmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kycService: KycService,
    private readonly eligibilityService: EligibilityService,
    private readonly eligibilityProofService: EligibilityProofService,
  ) {}

  async createInvestment(dto: CreateInvestmentDto, userId: number) {
    // Step 1: Fetch asset — throws if not found
    const asset = await this.prisma.asset.findUniqueOrThrow({
      where: { id: dto.assetId },
    });

    // Step 2: KYC gate
    const kycStatus = await this.kycService.getStatus(userId);
    if (kycStatus !== 'APPROVED') {
      throw new ForbiddenException(
        'KYC verification must be approved before investing.',
      );
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

    // Step 4: Create investment record
    const investment = await this.prisma.investment.create({
      data: {
        assetId: dto.assetId,
        userId,
        amount: dto.amount,
      },
    });

    // Step 5: Async ZK proof — fire-and-forget, non-blocking
    this.eligibilityProofService
      .generateProof(userId)
      .catch((err) =>
        this.logger.warn(
          `ZK proof generation failed for user ${userId} (non-blocking)`,
          err,
        ),
      );

    return investment;
  }
}
```

### SZK-8.3 Flow Verification

```
createInvestment(dto, userId)
   │
   ├─ 1. prisma.asset.findUniqueOrThrow()          [sync, throws 404]
   │
   ├─ 2. kycService.getStatus()                    [sync, throws 403]
   │
   ├─ 3.5 eligibilityService.isPrimeRequired()     [sync, config read]
   │         ├─ false → skip tier check
   │         └─ true  → resolveInvestorTier()      [1 DB read]
   │                       ├─ PRIME  → continue
   │                       └─ RETAIL → throw 403
   │
   ├─ 4. prisma.investment.create()                [sync, writes DB]
   │
   └─ 5. eligibilityProofService.generateProof()   [async, fire-and-forget]
             └─ ZK proof write (non-blocking)
```

### SZK-8.4 Deliverables

- `src/investments/investments.module.ts` updated with `EligibilityModule` and `EligibilityProofModule` imports.
- `src/investments/investments.service.ts` updated with step 3.5 gating.

### SZK-8.5 Acceptance Criteria

- RETAIL user attempting SPV investment receives `403 Forbidden` with the correct message.
- PRIME user passes the gating check and investment is created.
- KYC-unapproved user receives `403` before tier check is reached.
- ZK proof failure does NOT prevent investment creation (fire-and-forget confirmed).
- Asset not in `primeRequiredAssetTypes` and below `primeMinAmount` skips tier check entirely.

---

## SZK-9 — StellarZkProvider — Real ManageData Transaction

**Complexity:** High  
**Depends on:** SZK-7  
**Repo:** `buildvest-backend`  
**Phase:** B (Production)  
**Est. time:** 2 hours

### SZK-9.1 Install Stellar SDK

```bash
npm install @stellar/stellar-sdk
```

### SZK-9.2 StellarZkProvider

```typescript
// src/eligibility-proof/providers/stellar-zk.provider.ts

import { createHash, randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Horizon,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { EligibilityClaim } from '../../eligibility/claims/eligibility-claims.types';
import { ZkProviderInterface, ZkProofResult } from './zk-provider.interface';

const MANAGE_DATA_KEY_ELIGIBILITY = 'bv:eligibility:v1';
const MANAGE_DATA_KEY_IDENTITY = 'bv:identity:v1';

@Injectable()
export class StellarZkProvider implements ZkProviderInterface {
  private readonly logger = new Logger(StellarZkProvider.name);
  private readonly server: Horizon.Server;
  private readonly keypair: Keypair;
  private readonly networkPassphrase: string;

  constructor(private readonly config: ConfigService) {
    const horizonUrl = this.config.get<string>(
      'app.providers.stellar.horizonUrl',
      'https://horizon-testnet.stellar.org',
    );
    const accountSecret = this.config.get<string>(
      'app.providers.stellar.accountSecret',
    );
    if (!accountSecret) {
      throw new Error('STELLAR_ACCOUNT_SECRET is required for StellarZkProvider');
    }

    this.server = new Horizon.Server(horizonUrl);
    this.keypair = Keypair.fromSecret(accountSecret);
    this.networkPassphrase = horizonUrl.includes('testnet')
      ? Networks.TESTNET
      : Networks.PUBLIC;
  }

  async writeProof(
    userId: number,
    claims: EligibilityClaim[],
  ): Promise<ZkProofResult> {
    const financialClaim = claims.find((c) => c.type === 'FINANCIAL_ELIGIBILITY');
    const identityClaim = claims.find((c) => c.type === 'IDENTITY_BINDING');

    if (!financialClaim || !identityClaim) {
      throw new Error(
        'Both FinancialEligibilityClaim and IdentityBindingClaim are required',
      );
    }

    const claimsHash = createHash('sha256')
      .update(JSON.stringify(claims))
      .digest('hex');

    // Load account
    const account = await this.server.loadAccount(this.keypair.publicKey());

    // Build ManageData entries
    // Values must be ≤ 64 bytes; we store compact JSON
    const eligibilityValue = Buffer.from(
      JSON.stringify({
        tier: (financialClaim as any).tier,
        basis: (financialClaim as any).basis,
        until: (financialClaim as any).validUntil,
        hash: claimsHash.slice(0, 16), // 16-char prefix for compactness
      }),
    );
    const identityValue = Buffer.from(
      JSON.stringify({
        uid: (identityClaim as any).userIdHash.slice(0, 16),
        chain: (identityClaim as any).chain ?? 'stellar',
      }),
    );

    if (eligibilityValue.length > 64 || identityValue.length > 64) {
      throw new Error('ManageData value exceeds 64-byte Stellar limit');
    }

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.manageData({
          name: MANAGE_DATA_KEY_ELIGIBILITY,
          value: eligibilityValue,
        }),
      )
      .addOperation(
        Operation.manageData({
          name: MANAGE_DATA_KEY_IDENTITY,
          value: identityValue,
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(this.keypair);

    const result = await this.server.submitTransaction(tx);
    const proofId = `stellar-${result.hash}`;

    this.logger.log(
      `Stellar ManageData written: hash=${result.hash} ledger=${result.ledger}`,
    );

    return {
      proofId,
      transactionHash: result.hash,
      ledger: result.ledger,
      network: this.networkPassphrase === Networks.TESTNET ? 'testnet' : 'mainnet',
      writtenAt: new Date().toISOString(),
      claimsHash,
    };
  }

  async verifyProof(proofId: string): Promise<boolean> {
    if (!proofId.startsWith('stellar-')) return false;
    const txHash = proofId.replace('stellar-', '');
    try {
      await this.server.transactions().transaction(txHash).call();
      return true;
    } catch {
      return false;
    }
  }
}
```

### SZK-9.3 Stellar Account Setup (Testnet)

```bash
# Generate keypair
node -e "
const { Keypair } = require('@stellar/stellar-sdk');
const kp = Keypair.random();
console.log('Public:', kp.publicKey());
console.log('Secret:', kp.secret());
"

# Fund on testnet via Friendbot
curl "https://friendbot.stellar.org?addr=<PUBLIC_KEY>"

# Verify
curl "https://horizon-testnet.stellar.org/accounts/<PUBLIC_KEY>" | jq .balances
```

### SZK-9.4 Verifying Proof on Horizon

```bash
# Read ManageData entries for the account
curl "https://horizon-testnet.stellar.org/accounts/<PUBLIC_KEY>" \
  | jq '.data | to_entries[] | { key: .key, value: (.value | @base64d) }'

# Expected output:
# { "key": "bv:eligibility:v1", "value": "{\"tier\":\"PRIME\",\"basis\":\"HYBRID\",...}" }
# { "key": "bv:identity:v1",    "value": "{\"uid\":\"a3f2...\",\"chain\":\"stellar\"}" }
```

### SZK-9.5 Deliverables

- `src/eligibility-proof/providers/stellar-zk.provider.ts`
- Stellar testnet account keypair (stored in `.env`, never committed)

### SZK-9.6 Acceptance Criteria

- `StellarZkProvider.writeProof()` submits a transaction to testnet and returns a `proofId` starting with `stellar-`.
- `ManageData` entries for `bv:eligibility:v1` and `bv:identity:v1` are readable via Horizon API.
- `verifyProof(proofId)` returns `true` for a valid testnet transaction hash.
- ManageData values are ≤ 64 bytes.
- No `STELLAR_ACCOUNT_SECRET` value appears in any log line.

---

## SZK-10 — Frontend Eligibility Tier Badge (Optional)

**Complexity:** Low  
**Depends on:** SZK-6  
**Repo:** `buildvest-frontend`  
**Phase:** A (hackathon demo)  
**Est. time:** 20 minutes

### SZK-10.1 EligibilityTierBadge Component

```tsx
// src/components/EligibilityTierBadge.tsx

import React from 'react';

interface Props {
  tier: 'RETAIL' | 'PRIME';
  className?: string;
}

export const EligibilityTierBadge: React.FC<Props> = ({ tier, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium
      ${tier === 'PRIME'
        ? 'bg-amber-100 text-amber-800 border border-amber-300'
        : 'bg-gray-100 text-gray-600 border border-gray-300'
      } ${className}`}
  >
    {tier === 'PRIME' ? '⭐' : '○'} {tier === 'PRIME' ? 'PRIME Investor' : 'RETAIL Investor'}
  </span>
);
```

### SZK-10.2 EligibilityTierStatus Component

```tsx
// src/components/EligibilityTierStatus.tsx

import React from 'react';
import { differenceInDays, formatDistanceToNow, parseISO } from 'date-fns';

interface Props {
  status?: string;
  expiresAt?: string;
  retryAfter?: string;
}

export const EligibilityTierStatus: React.FC<Props> = ({
  status,
  expiresAt,
  retryAfter,
}) => {
  if (!status) {
    return <p className="text-sm text-gray-500">No eligibility application found.</p>;
  }

  const isExpiringSoon =
    expiresAt && differenceInDays(parseISO(expiresAt), new Date()) <= 30;

  return (
    <div className="space-y-1">
      <p className="text-sm">
        Status: <strong>{status.replace('_', ' ')}</strong>
      </p>
      {expiresAt && (
        <p className={`text-sm ${isExpiringSoon ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
          {isExpiringSoon ? '⚠️ ' : ''}
          Expires {formatDistanceToNow(parseISO(expiresAt), { addSuffix: true })}
        </p>
      )}
      {retryAfter && status === 'REJECTED' && (
        <p className="text-sm text-gray-500">
          Can reapply {formatDistanceToNow(parseISO(retryAfter), { addSuffix: true })}
        </p>
      )}
    </div>
  );
};
```

### SZK-10.3 InvestorSettings.tsx — Eligibility Tier Section

```tsx
// src/pages/settings/InvestorSettings.tsx (relevant section)

import { EligibilityTierBadge } from '../../components/EligibilityTierBadge';
import { EligibilityTierStatus } from '../../components/EligibilityTierStatus';

// Inside the component:
<Section title="Eligibility Tier">
  <div className="space-y-4">
    <EligibilityTierBadge tier={eligibilityData?.tier ?? 'RETAIL'} />
    <EligibilityTierStatus
      status={eligibilityData?.status}
      expiresAt={eligibilityData?.expiresAt}
      retryAfter={eligibilityData?.retryAfter}
    />
    {eligibilityData?.zkProofId && (
      <a
        href={`https://stellar.expert/explorer/testnet/tx/${
          eligibilityData.zkProofId.replace('stellar-', '')
        }`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline"
      >
        View ZK Proof on Stellar Explorer →
      </a>
    )}
    {!eligibilityData || eligibilityData.tier === 'RETAIL' ? (
      <button
        className="btn btn-primary"
        onClick={handleApplyForPrime}
      >
        Apply for PRIME Tier
      </button>
    ) : null}
  </div>
</Section>
```

### SZK-10.4 API Client

```typescript
// src/api/eligibility.ts

import { apiClient } from './client';

export interface EligibilityStatusResponse {
  id: string;
  tier: 'RETAIL' | 'PRIME';
  status: string;
  expiresAt?: string;
  retryAfter?: string;
  zkProofId?: string;
  zkProofGeneratedAt?: string;
}

export const eligibilityApi = {
  apply: () => apiClient.post<EligibilityStatusResponse>('/api/v1/eligibility/apply'),
  getStatus: () => apiClient.get<EligibilityStatusResponse | null>('/api/v1/eligibility/status'),
  submit: (data: { preferredBasis: string }) =>
    apiClient.post<EligibilityStatusResponse>('/api/v1/eligibility/submit', data),
  getProof: () => apiClient.get('/api/v1/eligibility/proof'),
  renew: () => apiClient.post<EligibilityStatusResponse>('/api/v1/eligibility/renew'),
};
```

### SZK-10.5 Deliverables

- `src/components/EligibilityTierBadge.tsx`
- `src/components/EligibilityTierStatus.tsx`
- `src/pages/settings/InvestorSettings.tsx` updated (Eligibility Tier section)
- `src/api/eligibility.ts`

### SZK-10.6 Acceptance Criteria

- `EligibilityTierBadge` renders "⭐ PRIME Investor" for PRIME, "○ RETAIL Investor" for RETAIL.
- Expiry warning shows when `daysUntilExpiry <= 30`.
- ZK proof link renders only when `zkProofId` is present.
- "Apply for PRIME Tier" button visible only when no active PRIME profile exists.

---

## SZK-11 — Integration Testing & Documentation

**Complexity:** Medium  
**Depends on:** SZK-1 through SZK-8  
**Repo:** `buildvest-backend`  
**Est. time:** 30 minutes

### SZK-11.1 Unit Tests — TierRulesEngine

```typescript
// test/unit/tier-rules.engine.spec.ts

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TierRulesEngine } from '../../src/eligibility/tier-rules.engine';
import { FinancialDataSnapshot } from '../../src/eligibility/providers/eligibility-provider.interface';

const mockConfig = (overrides: Record<string, unknown> = {}) =>
  ({
    get: (key: string, defaultValue?: unknown) => {
      const defaults: Record<string, unknown> = {
        'app.eligibility.monthlyBalanceFloor': 5_000_000,
        'app.eligibility.monthlyBalanceMonths': 4,
        'app.eligibility.annualCashFlowFloor': 20_000_000,
        ...overrides,
      };
      return defaults[key] ?? defaultValue;
    },
  } as unknown as ConfigService);

const makeSnapshot = (
  overrides: Partial<FinancialDataSnapshot> = {},
): FinancialDataSnapshot => ({
  userId: 1,
  monthlyBalances: Array.from({ length: 6 }, (_, i) => ({
    month: `2025-0${i + 1}`,
    averageBalance: 6_000_000, // ₦6M each — above ₦5M floor
  })),
  annualCashFlow: 25_000_000, // ₦25M — above ₦20M floor
  currency: 'NGN',
  fetchedAt: new Date().toISOString(),
  provider: 'mock',
  ...overrides,
});

describe('TierRulesEngine', () => {
  let engine: TierRulesEngine;

  beforeEach(() => {
    engine = new TierRulesEngine(mockConfig());
  });

  it('returns PRIME/HYBRID when both paths qualify', () => {
    const result = engine.evaluate(makeSnapshot());
    expect(result.tier).toBe('PRIME');
    expect(result.basis).toBe('HYBRID');
  });

  it('returns PRIME/LIQUIDITY_ANALYSIS when only liquidity path qualifies', () => {
    const result = engine.evaluate(makeSnapshot({ annualCashFlow: 1_000_000 }));
    expect(result.tier).toBe('PRIME');
    expect(result.basis).toBe('LIQUIDITY_ANALYSIS');
  });

  it('returns PRIME/LIQUIDITY_ANALYSIS when only cash flow path qualifies', () => {
    const snapshot = makeSnapshot({
      monthlyBalances: Array.from({ length: 6 }, (_, i) => ({
        month: `2025-0${i + 1}`,
        averageBalance: 1_000_000, // Below ₦5M floor
      })),
    });
    const result = engine.evaluate(snapshot);
    expect(result.tier).toBe('PRIME');
    expect(result.basis).toBe('LIQUIDITY_ANALYSIS');
  });

  it('returns RETAIL/DEFAULT when neither path qualifies', () => {
    const snapshot = makeSnapshot({
      monthlyBalances: Array.from({ length: 6 }, (_, i) => ({
        month: `2025-0${i + 1}`,
        averageBalance: 1_000_000,
      })),
      annualCashFlow: 1_000_000,
    });
    const result = engine.evaluate(snapshot);
    expect(result.tier).toBe('RETAIL');
    expect(result.basis).toBe('DEFAULT');
  });

  it('requires 4 of 6 qualifying months for liquidity path', () => {
    const months = Array.from({ length: 6 }, (_, i) => ({
      month: `2025-0${i + 1}`,
      averageBalance: i < 3 ? 6_000_000 : 1_000_000, // Only 3 qualifying months
    }));
    const result = engine.evaluate(makeSnapshot({ monthlyBalances: months, annualCashFlow: 1_000_000 }));
    expect(result.tier).toBe('RETAIL');
  });

  it('tracks rulesVersion', () => {
    expect(engine.rulesVersion).toBe('1.0.0');
    const result = engine.evaluate(makeSnapshot());
    expect(result.rulesVersion).toBe('1.0.0');
  });
});
```

### SZK-11.2 Unit Tests — EligibilityService.isPrimeRequired

```typescript
// test/unit/eligibility.service.spec.ts (isPrimeRequired section)

describe('EligibilityService.isPrimeRequired', () => {
  let service: EligibilityService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EligibilityService,
        { provide: PrismaService, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: unknown) => {
              if (key === 'app.providers.stellar.primeRequiredAssetTypes')
                return ['SPV', 'CROSS_BORDER_REIT'];
              if (key === 'app.providers.stellar.primeMinAmount') return 10_000_000;
              return def;
            },
          },
        },
        { provide: ELIGIBILITY_PROVIDER, useClass: MockEligibilityProvider },
        TierRulesEngine,
      ],
    }).compile();
    service = module.get(EligibilityService);
  });

  it('returns true for gated asset type regardless of amount', async () => {
    const result = await service.isPrimeRequired(
      { assetType: 'SPV', fundingTarget: 0 }, 100,
    );
    expect(result).toBe(true);
  });

  it('returns true for amount above threshold regardless of asset type', async () => {
    const result = await service.isPrimeRequired(
      { assetType: 'DOMESTIC_REIT', fundingTarget: 0 }, 15_000_000,
    );
    expect(result).toBe(true);
  });

  it('returns false for non-gated asset below threshold', async () => {
    const result = await service.isPrimeRequired(
      { assetType: 'DOMESTIC_REIT', fundingTarget: 0 }, 500_000,
    );
    expect(result).toBe(false);
  });
});
```

### SZK-11.3 Unit Tests — Investment Gating Integration

```typescript
// test/unit/investments.service.spec.ts (gating section)

describe('InvestmentsService — Step 3.5 tier gating', () => {
  it('throws ForbiddenException for RETAIL user on PRIME-required asset', async () => {
    // Setup: mock resolveInvestorTier returns 'RETAIL', isPrimeRequired returns true
    await expect(
      service.createInvestment({ assetId: 'spv-1', amount: 100_000 }, userId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates investment for PRIME user on PRIME-required asset', async () => {
    // Setup: mock resolveInvestorTier returns 'PRIME', isPrimeRequired returns true
    await expect(
      service.createInvestment({ assetId: 'spv-1', amount: 100_000 }, userId),
    ).resolves.toMatchObject({ assetId: 'spv-1' });
  });

  it('creates investment for RETAIL user on non-gated asset', async () => {
    // Setup: mock isPrimeRequired returns false
    await expect(
      service.createInvestment({ assetId: 'reit-1', amount: 50_000 }, userId),
    ).resolves.toMatchObject({ assetId: 'reit-1' });
  });

  it('does not block investment when ZK proof generation fails', async () => {
    // Setup: eligibilityProofService.generateProof throws
    // Investment should still be created
    await expect(
      service.createInvestment({ assetId: 'reit-1', amount: 50_000 }, userId),
    ).resolves.toBeDefined();
  });
});
```

### SZK-11.4 Integration Smoke Test Script

```bash
# Smoke test — run after npm run start:dev

BASE=http://localhost:3000
TOKEN="Bearer <your-jwt-token>"

# 1. Check eligibility status (no profile)
curl -s -H "Authorization: $TOKEN" $BASE/api/v1/eligibility/status

# 2. Apply for tier
curl -s -X POST -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{}' $BASE/api/v1/eligibility/apply

# 3. Submit application (mock provider auto-approves to PRIME)
curl -s -X POST -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"preferredBasis":"LIQUIDITY_ANALYSIS"}' $BASE/api/v1/eligibility/submit

# 4. Check status — should be APPROVED, tier PRIME
curl -s -H "Authorization: $TOKEN" $BASE/api/v1/eligibility/status

# 5. Attempt SPV investment as PRIME user — should succeed (201)
curl -s -X POST -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"assetId":"<spv-asset-id>","amount":100000}' $BASE/api/v1/investments

# 6. Reset to RETAIL (direct DB update) and retry — should get 403
```

### SZK-11.5 Documentation Checklist

After completing SZK-1 through SZK-10, verify:

- [ ] `.env.example` includes all new keys with comments
- [ ] `README.md` or equivalent mentions `EligibilityModule` and `EligibilityProofModule`
- [ ] `docs/Stellar_ZK_Proofs.md` reflects V3 architecture (this update)
- [ ] `docs/Stellar_ZK_Proofs_Execution.md` reflects V3 steps (this document)
- [ ] Prisma migration file committed and named `add_eligibility_profile`
- [ ] No `AccreditedInvestorClaim`, `ACCREDITED_INVESTOR`, `shouldVerify`, `STELLAR_ZK_GATED_ASSET_TYPES`, or `STELLAR_ZK_MIN_FUNDING_TARGET` references remain in codebase

### SZK-11.6 Deliverables

- `test/unit/tier-rules.engine.spec.ts`
- `test/unit/eligibility.service.spec.ts`
- `test/unit/investments.service.spec.ts`
- Documentation checklist complete

### SZK-11.7 Acceptance Criteria

- All `TierRulesEngine` unit tests pass.
- `isPrimeRequired` tests pass for all three cases (gated type, high amount, non-gated).
- Investment gating integration test: RETAIL → 403, PRIME → 201.
- ZK failure test: investment still created when `generateProof` throws.
- `npm run test` exits 0 with no new failures introduced.

---

## Appendix A — V3 Claim Payload Examples

### FinancialEligibilityClaim (PRIME)

```json
{
  "type": "FINANCIAL_ELIGIBILITY",
  "tier": "PRIME",
  "basis": "HYBRID",
  "verifiedAt": "2026-04-07T10:00:00.000Z",
  "validUntil": "2027-04-07T10:00:00.000Z",
  "platformNote": "These claims represent BuildVest's PLATFORM-DEFINED eligibility assessment. They are NOT regulatory determinations under any applicable law or regulation."
}
```

### FinancialEligibilityClaim (RETAIL — default, no verification)

```json
{
  "type": "FINANCIAL_ELIGIBILITY",
  "tier": "RETAIL",
  "basis": "DEFAULT",
  "verifiedAt": "2026-04-07T10:00:00.000Z",
  "validUntil": "2026-04-07T10:00:00.000Z",
  "platformNote": "These claims represent BuildVest's PLATFORM-DEFINED eligibility assessment. They are NOT regulatory determinations under any applicable law or regulation."
}
```

### IdentityBindingClaim

```json
{
  "type": "IDENTITY_BINDING",
  "userIdHash": "a3f2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
  "walletAddress": null,
  "chain": null
}
```

---

## Appendix B — Config Key Reference

| Env Var | Config Path | Default | Notes |
|---------|-------------|---------|-------|
| `ELIGIBILITY_ENABLED` | `app.eligibility.enabled` | `false` | Master feature switch |
| `ELIGIBILITY_PROVIDER` | `app.eligibility.provider` | `'mock'` | `'mock'` or `'mono'`; blocks prod if `'mock'` |
| `STELLAR_PRIME_REQUIRED_ASSET_TYPES` | `app.providers.stellar.primeRequiredAssetTypes` | `[]` | Comma-separated asset type codes |
| `STELLAR_PRIME_MIN_AMOUNT` | `app.providers.stellar.primeMinAmount` | `0` | NGN; 0 disables amount-based gating |
| `ELIGIBILITY_MONTHLY_BALANCE_FLOOR` | `app.eligibility.monthlyBalanceFloor` | `5000000` | NGN ₦5M |
| `ELIGIBILITY_MONTHLY_BALANCE_MONTHS` | `app.eligibility.monthlyBalanceMonths` | `4` | Qualifying months of 6 |
| `ELIGIBILITY_ANNUAL_CASH_FLOW_FLOOR` | `app.eligibility.annualCashFlowFloor` | `20000000` | NGN ₦20M |
| `ELIGIBILITY_TIER_VALIDITY_DAYS` | `app.eligibility.tierValidityDays` | `365` | Days until PRIME expires |
| `ELIGIBILITY_RENEWAL_REMINDER_DAYS` | `app.eligibility.renewalReminderDays` | `30` | Days before expiry to remind |
| `STELLAR_ZK_PROOF_ENABLED` | `app.providers.stellar.zkProofEnabled` | `false` | Enable real Stellar ManageData write |
| `STELLAR_HORIZON_URL` | `app.providers.stellar.horizonUrl` | testnet URL | Stellar Horizon endpoint |
| `STELLAR_ACCOUNT_SECRET` | `app.providers.stellar.accountSecret` | — | Required for `StellarZkProvider` |

---

## Appendix C — Module Dependency Graph

```
AppModule
  ├── EligibilityModule
  │     ├── PrismaModule
  │     ├── ConfigModule (global)
  │     ├── TierRulesEngine
  │     ├── [ELIGIBILITY_PROVIDER]
  │     │       ├── MockEligibilityProvider (default)
  │     │       └── MonoEligibilityProvider (ELIGIBILITY_PROVIDER=mono)
  │     ├── EligibilityService   ← exported
  │     ├── EligibilityController
  │     └── EligibilityAdminController
  │
  ├── EligibilityProofModule
  │     ├── PrismaModule
  │     ├── EligibilityModule    ← imports EligibilityService
  │     ├── [ZK_PROVIDER]
  │     │       ├── MockZkProvider (default)
  │     │       └── StellarZkProvider (STELLAR_ZK_PROOF_ENABLED=true)
  │     └── EligibilityProofService  ← exported
  │
  └── InvestmentsModule
        ├── EligibilityModule    ← imports EligibilityService
        ├── EligibilityProofModule  ← imports EligibilityProofService
        ├── KycModule            (unchanged)
        └── InvestmentsService
```

No circular dependencies. Dependency flow is strictly:
`InvestmentsModule → EligibilityProofModule → EligibilityModule → PrismaModule`
