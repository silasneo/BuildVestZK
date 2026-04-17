import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProofService } from '../proof/proof.service';
import { StellarService } from '../proof/stellar.service';
import { TierRulesEngine } from './tier-rules.engine';

@Injectable()
export class EligibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tierRulesEngine: TierRulesEngine,
    private readonly proofService: ProofService,
    private readonly stellarService: StellarService,
  ) {}

  async getStatus(userId: number): Promise<{
    tier: string;
    status: string;
    qualified: boolean;
    proofHash: string | null;
    stellarTxHash: string | null;
    sorobanTxHash: string | null;
    verificationMethod: string | null;
  } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { eligibility: true },
    });

    if (!user || !user.eligibility) {
      return null;
    }

    return {
      tier: user.tier,
      status: user.eligibility.status,
      qualified: user.eligibility.qualified,
      proofHash: user.eligibility.proofHash,
      stellarTxHash: user.eligibility.stellarTxHash,
      sorobanTxHash: user.eligibility.sorobanTxHash,
      verificationMethod: user.eligibility.verificationMethod,
    };
  }

  async evaluate(userId: number, monthBalances: number[]): Promise<{
    qualified: boolean;
    tier: string;
    proofHash?: string;
    stellarTxHash?: string | null;
    sorobanTxHash?: string | null;
    verificationMethod?: string;
  }> {
    const qualified = this.tierRulesEngine.evaluate(monthBalances);

    if (!qualified) {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { tier: 'RETAIL' },
        }),
        this.prisma.eligibilityProfile.upsert({
          where: { userId },
          update: {
            status: 'REJECTED',
            monthBalances: JSON.stringify(monthBalances),
            qualified: false,
            proofHash: null,
            stellarTxHash: null,
            sorobanTxHash: null,
            stellarAccountId: null,
            verificationMethod: null,
            evaluatedAt: new Date(),
          },
          create: {
            userId,
            status: 'REJECTED',
            monthBalances: JSON.stringify(monthBalances),
            qualified: false,
            evaluatedAt: new Date(),
          },
        }),
      ]);

      return {
        qualified: false,
        tier: 'RETAIL',
      };
    }

    const { proofHash } = await this.proofService.generateAndVerify(monthBalances, 1000);
    const anchored = await this.stellarService.anchorProof(userId, proofHash);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { tier: 'PRIME' },
      }),
      this.prisma.eligibilityProfile.upsert({
        where: { userId },
        update: {
          status: 'APPROVED',
          monthBalances: JSON.stringify(monthBalances),
          qualified: true,
          proofHash,
          stellarTxHash: anchored?.txHash ?? null,
          sorobanTxHash: null,
          stellarAccountId: anchored?.accountId ?? null,
          verificationMethod: 'mock',
          evaluatedAt: new Date(),
        },
        create: {
          userId,
          status: 'APPROVED',
          monthBalances: JSON.stringify(monthBalances),
          qualified: true,
          proofHash,
          stellarTxHash: anchored?.txHash ?? null,
          sorobanTxHash: null,
          stellarAccountId: anchored?.accountId ?? null,
          verificationMethod: 'mock',
          evaluatedAt: new Date(),
        },
      }),
    ]);

    return {
      qualified: true,
      tier: 'PRIME',
      proofHash,
      stellarTxHash: anchored?.txHash ?? null,
      sorobanTxHash: null,
      verificationMethod: 'mock',
    };
  }
}
