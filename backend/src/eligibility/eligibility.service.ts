import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';
import { VerificationService } from '../verification/verification.service';
import { ZkService } from '../zk/zk.service';
import { TierRulesEngine } from './tier-rules.engine';

@Injectable()
export class EligibilityService {
  private readonly logger = new Logger(EligibilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tierRulesEngine: TierRulesEngine,
    private readonly zkService: ZkService,
    private readonly stellarService: StellarService,
    private readonly verificationService: VerificationService,
  ) {}

  async getStatus(userId: number): Promise<{
    tier: string;
    status: string;
    qualified: boolean;
    proofHash: string | null;
    stellarTxHash: string | null;
    stellarLedger: number | null;
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
      stellarLedger: user.eligibility.stellarLedger,
      sorobanTxHash: user.eligibility.sorobanTxHash,
      verificationMethod: user.eligibility.verificationMethod,
    };
  }

  async evaluate(
    userId: number,
    userEmail: string,
    monthBalances: number[],
  ): Promise<{
    qualified: boolean;
    tier: string;
    proofHash?: string;
    stellarTxHash?: string | null;
    stellarLedger?: number | null;
    stellarExplorerUrl?: string | null;
    horizonUrl?: string | null;
    sorobanTxHash?: string | null;
    sorobanExplorerUrl?: string | null;
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
            stellarLedger: null,
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

    const { proofHash } = await this.zkService.generateAndVerify(
      monthBalances,
      1000,
    );
    const anchored = await this.stellarService.submitProofHash(
      proofHash,
      userEmail,
    );
    const stellarTxHash = anchored?.txHash ?? null;
    const stellarLedger = anchored?.ledger ?? null;
    const network = this.getStellarNetwork();

    // Run verification toggle (local vs on-chain)
    const verification = await this.verificationService.verify(proofHash, [
      String(1000),
    ]);
    const verificationMethod = verification.verificationMethod;
    const sorobanTxHash = verification.sorobanTxHash ?? null;
    const sorobanExplorerUrl = verification.sorobanExplorerUrl ?? null;

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
          stellarTxHash,
          stellarLedger,
          sorobanTxHash,
          stellarAccountId: null,
          verificationMethod,
          evaluatedAt: new Date(),
        },
        create: {
          userId,
          status: 'APPROVED',
          monthBalances: JSON.stringify(monthBalances),
          qualified: true,
          proofHash,
          stellarTxHash,
          stellarLedger,
          sorobanTxHash,
          stellarAccountId: null,
          verificationMethod,
          evaluatedAt: new Date(),
        },
      }),
    ]);

    return {
      qualified: true,
      tier: 'PRIME',
      proofHash,
      stellarTxHash,
      stellarLedger,
      stellarExplorerUrl: stellarTxHash
        ? `${this.getStellarExplorerBaseUrl(network)}${stellarTxHash}`
        : null,
      horizonUrl: stellarTxHash
        ? `${this.getHorizonTransactionBaseUrl(network)}${stellarTxHash}`
        : null,
      sorobanTxHash,
      sorobanExplorerUrl,
      verificationMethod,
    };
  }

  private getStellarNetwork(): 'testnet' | 'public' {
    return process.env.STELLAR_NETWORK?.toLowerCase() === 'public'
      ? 'public'
      : 'testnet';
  }

  private getStellarExplorerBaseUrl(network: 'testnet' | 'public'): string {
    return network === 'public'
      ? 'https://stellar.expert/explorer/public/tx/'
      : 'https://stellar.expert/explorer/testnet/tx/';
  }

  private getHorizonTransactionBaseUrl(network: 'testnet' | 'public'): string {
    return network === 'public'
      ? 'https://horizon.stellar.org/transactions/'
      : 'https://horizon-testnet.stellar.org/transactions/';
  }
}
