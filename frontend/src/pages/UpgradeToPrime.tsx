import { AxiosError } from 'axios';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProofStatus from '../components/ProofStatus';
import StatementUpload from '../components/StatementUpload';
import { evaluateEligibility } from '../lib/api';

interface EligibilityResult {
  qualified: boolean;
  tier: 'RETAIL' | 'PRIME';
  proofHash?: string;
  stellarTxHash?: string | null;
  sorobanTxHash?: string | null;
  verificationMethod?: string;
}

function UpgradeToPrime() {
  const navigate = useNavigate();
  const [month1, setMonth1] = useState('1500');
  const [month2, setMonth2] = useState('2300');
  const [month3, setMonth3] = useState('1800');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState('');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const monthBalances = [Number(month1), Number(month2), Number(month3)];
      const response = await evaluateEligibility(monthBalances);
      const data = response.data as EligibilityResult;
      setResult(data);

      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser) as { id: number; email: string; tier: 'RETAIL' | 'PRIME' };
        localStorage.setItem('user', JSON.stringify({ ...parsed, tier: data.tier }));
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string | string[] }>;
      const message = axiosError.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Failed to evaluate eligibility.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto mb-6 flex w-full max-w-3xl justify-center">
        <img src="https://buildvest.net/buildvest-logo.png" alt="BuildVest" className="h-10" />
      </div>
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Upgrade to PRIME Investor</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter your last 3 monthly ending balances. All must be above $1,000 to qualify.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <StatementUpload />

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm text-slate-700">
              Month 1 Balance ($)
              <input
                type="number"
                value={month1}
                onChange={(event) => setMonth1(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-bv-blue focus:outline-none focus:ring-2 focus:ring-bv-blue/20"
                required
              />
            </label>
            <label className="text-sm text-slate-700">
              Month 2 Balance ($)
              <input
                type="number"
                value={month2}
                onChange={(event) => setMonth2(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-bv-blue focus:outline-none focus:ring-2 focus:ring-bv-blue/20"
                required
              />
            </label>
            <label className="text-sm text-slate-700">
              Month 3 Balance ($)
              <input
                type="number"
                value={month3}
                onChange={(event) => setMonth3(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-bv-blue focus:outline-none focus:ring-2 focus:ring-bv-blue/20"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-bv-blue px-4 py-3 font-semibold text-white transition hover:bg-bv-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Evaluating...' : 'Evaluate Eligibility'}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {result?.qualified && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <p className="font-semibold">✅ Congratulations! You've been upgraded to PRIME Investor</p>
            <div className="mt-4">
              <ProofStatus
                proofHash={result.proofHash}
                stellarTxHash={result.stellarTxHash}
                sorobanTxHash={result.sorobanTxHash}
                verificationMethod={result.verificationMethod}
              />
            </div>
            <button
              type="button"
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard →
            </button>
          </div>
        )}

        {result && !result.qualified && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">❌ Does not qualify. All 3 monthly balances must exceed $1,000.</p>
            <p className="mt-2 text-sm">Verification method: {result.verificationMethod || 'N/A'}</p>
            <button
              type="button"
              className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
              onClick={() => setResult(null)}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UpgradeToPrime;
