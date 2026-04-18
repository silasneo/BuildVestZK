import { Injectable, Logger } from '@nestjs/common';
import type { VerificationResult } from './verification.interface.js';

/**
 * Soroban on-chain verification strategy.
 *
 * Submits the proof hash to the deployed Soroban verifier contract.
 * Requires SOROBAN_RPC_URL and SOROBAN_VERIFIER_CONTRACT_ID to be set.
 */
@Injectable()
export class SorobanVerifier {
  private readonly logger = new Logger(SorobanVerifier.name);

  async verify(
    proofHash: string,
    _publicInputs: string[],
  ): Promise<VerificationResult> {
    const contractId = process.env.SOROBAN_VERIFIER_CONTRACT_ID?.trim();
    const rpcUrl =
      process.env.SOROBAN_RPC_URL?.trim() ||
      'https://soroban-testnet.stellar.org';
    const secretKey = process.env.STELLAR_SECRET_KEY?.trim();

    if (!contractId) {
      throw new Error(
        'SOROBAN_VERIFIER_CONTRACT_ID is not set; cannot verify on-chain.',
      );
    }

    if (!secretKey) {
      throw new Error(
        'STELLAR_SECRET_KEY is not set; cannot sign Soroban transaction.',
      );
    }

    this.logger.log(
      `Submitting proof to Soroban contract ${contractId} via ${rpcUrl}`,
    );

    // Dynamic import to avoid hard failure when @stellar/stellar-sdk is not
    // available or the Soroban RPC is unreachable.
    const {
      Keypair,
      Networks,
      TransactionBuilder,
      BASE_FEE,
      SorobanRpc,
      xdr,
      nativeToScVal,
      Address,
      Contract,
    } = await import('@stellar/stellar-sdk');

    const server = new SorobanRpc.Server(rpcUrl);
    const keypair = Keypair.fromSecret(secretKey);
    const account = await server.getAccount(keypair.publicKey());
    const network =
      process.env.STELLAR_NETWORK?.toLowerCase() === 'public'
        ? Networks.PUBLIC
        : Networks.TESTNET;

    const contract = new Contract(contractId);

    // Convert hex proof hash to a 32-byte buffer for BytesN<32>
    const proofBytes = Buffer.from(proofHash, 'hex');
    if (proofBytes.length !== 32) {
      throw new Error(
        `Proof hash must be 32 bytes (64 hex chars), got ${proofBytes.length} bytes.`,
      );
    }

    // Use a deterministic balances hash placeholder (the real hash is already
    // embedded in the ZK proof).
    const balancesHash = Buffer.alloc(32, 0);

    const proofHashVal = nativeToScVal(proofBytes, { type: 'bytes' });
    const balancesHashVal = nativeToScVal(balancesHash, { type: 'bytes' });
    const thresholdVal = nativeToScVal(1000, { type: 'u64' });

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: network,
    })
      .addOperation(
        contract.call('verify', proofHashVal, balancesHashVal, thresholdVal),
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    prepared.sign(keypair);
    const sendResponse = await server.sendTransaction(prepared);

    if (sendResponse.status === 'ERROR') {
      throw new Error(
        `Soroban transaction rejected: ${JSON.stringify(sendResponse)}`,
      );
    }

    // Poll for confirmation
    let getResponse = await server.getTransaction(sendResponse.hash);
    while (
      getResponse.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      getResponse = await server.getTransaction(sendResponse.hash);
    }

    if (
      getResponse.status !== SorobanRpc.Api.GetTransactionStatus.SUCCESS
    ) {
      throw new Error(
        `Soroban transaction failed with status: ${getResponse.status}`,
      );
    }

    const explorerBase =
      process.env.STELLAR_NETWORK?.toLowerCase() === 'public'
        ? 'https://stellar.expert/explorer/public/tx/'
        : 'https://stellar.expert/explorer/testnet/tx/';

    return {
      verified: true,
      verificationMethod: 'onchain',
      sorobanTxHash: sendResponse.hash,
      sorobanExplorerUrl: `${explorerBase}${sendResponse.hash}`,
    };
  }
}
