interface ProofStatusProps {
  proofHash?: string | null;
  stellarTxHash?: string | null;
  sorobanTxHash?: string | null;
  verificationMethod?: string | null;
}

function truncateHash(hash: string) {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function ProofStatus({ proofHash, stellarTxHash, sorobanTxHash, verificationMethod }: ProofStatusProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-md">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Proof Details</h3>
      <div className="space-y-3 text-sm text-gray-700">
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">Proof Hash</span>
          {proofHash ? (
            <div className="flex items-center gap-2">
              <code className="rounded bg-gray-100 px-2 py-1 text-xs text-blue-700">{truncateHash(proofHash)}</code>
              <button
                type="button"
                className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                onClick={() => navigator.clipboard.writeText(proofHash)}
              >
                Copy
              </button>
            </div>
          ) : (
            <span className="text-gray-400">N/A</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">Stellar Tx</span>
          {stellarTxHash ? (
            <a
              href={`https://horizon-testnet.stellar.org/transactions/${stellarTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              View Transaction
            </a>
          ) : (
            <span className="text-gray-400">N/A</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">Soroban Tx</span>
          {sorobanTxHash ? (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${sorobanTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              View Transaction
            </a>
          ) : (
            <span className="text-gray-400">N/A</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-500">Verification Method</span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            {verificationMethod || 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ProofStatus;
