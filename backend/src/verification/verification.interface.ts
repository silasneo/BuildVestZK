export interface VerificationResult {
  verified: boolean;
  verificationMethod: 'noir' | 'onchain';
  sorobanTxHash?: string;
  sorobanExplorerUrl?: string;
}
