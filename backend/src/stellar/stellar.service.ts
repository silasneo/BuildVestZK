import { Injectable, Logger } from '@nestjs/common';
import {
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { createHash } from 'crypto';

type StellarSubmissionResult = {
  txHash: string;
  ledger: number;
};

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);

  async submitProofHash(
    proofHash: string,
    userEmail: string,
  ): Promise<StellarSubmissionResult | null> {
    const secretKey = process.env.STELLAR_SECRET_KEY?.trim();
    if (!secretKey) {
      return null;
    }

    try {
      const keypair = Keypair.fromSecret(secretKey);
      const network = this.getNetwork();
      const server = new Horizon.Server(this.getHorizonUrl(network));
      const account = await server.loadAccount(keypair.publicKey());
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.getNetworkPassphrase(network),
      })
        .addOperation(
          Operation.manageData({
            name: this.getManageDataKey(userEmail),
            value: this.getManageDataValue(proofHash),
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(keypair);

      const result = await server.submitTransaction(transaction);
      return {
        txHash: result.hash,
        ledger: result.ledger,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to submit Stellar ManageData transaction: ${this.getErrorMessage(error)}`,
      );
      return null;
    }
  }

  private getNetwork(): 'testnet' | 'public' {
    return process.env.STELLAR_NETWORK === 'public' ? 'public' : 'testnet';
  }

  private getHorizonUrl(network: 'testnet' | 'public'): string {
    if (process.env.STELLAR_HORIZON_URL?.trim()) {
      return process.env.STELLAR_HORIZON_URL;
    }
    return network === 'public'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org';
  }

  private getNetworkPassphrase(network: 'testnet' | 'public'): string {
    return network === 'public' ? Networks.PUBLIC : Networks.TESTNET;
  }

  private getManageDataKey(userEmail: string): string {
    const prefix = 'buildvestzk:proof:';
    const sanitizedEmail = userEmail
      .toLowerCase()
      .replace(/[^a-z0-9:_-]/g, '_');
    const maxLength = 64;
    const maxEmailLength = maxLength - prefix.length;

    if (sanitizedEmail.length <= maxEmailLength) {
      return `${prefix}${sanitizedEmail}`;
    }

    const hashSuffix = createHash('sha256')
      .update(sanitizedEmail)
      .digest('hex')
      .slice(0, 12);
    const truncated = sanitizedEmail.slice(
      0,
      maxEmailLength - hashSuffix.length - 1,
    );
    return `${prefix}${truncated}_${hashSuffix}`;
  }

  private getManageDataValue(proofHash: string): Buffer {
    const value = Buffer.from(proofHash, 'utf8');
    if (value.length <= 64) {
      return value;
    }

    return Buffer.from(
      createHash('sha256').update(proofHash).digest('hex'),
      'utf8',
    );
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
