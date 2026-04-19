import { AxiosError } from 'axios';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProofStatus from '../components/ProofStatus';
import StatementUpload from '../components/StatementUpload';
import { SAMPLE_STATEMENT_BALANCES } from '../config/sampleStatements';
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
  const [month1, setMonth1] = useState('');
  const [month2, setMonth2] = useState('');
  const [month3, setMonth3] = useState('');
  const [hasUploadedPdf, setHasUploadedPdf] = useState(false);
  const [isKnownSample, setIsKnownSample] = useState(false);
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
        <h2 className="text-3xl font-extrabold tracking-tight text-bv-blue">BuildVest</h2>
      </div>
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Upgrade to PRIME Investor</h1>
        <p className="mt-2 text-sm text-slate-600">
          Upload your bank statement covering at least the last 3 months. All monthly ending balances must be above
          $1,000 to qualify as a Prime Investor.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <StatementUpload
            onFileSelect={(file) => {
              setResult(null);
              setError('');
              setHasUploadedPdf(Boolean(file));
              if (!file) {
                setIsKnownSample(false);
                setMonth1('');
                setMonth2('');
                setMonth3('');
                return;
              }
              const knownBalances = SAMPLE_STATEMENT_BALANCES[file.name];
              if (knownBalances) {
                setIsKnownSample(true);
                setMonth1(String(knownBalances[0]));
                setMonth2(String(knownBalances[1]));
                setMonth3(String(knownBalances[2]));
                return;
              }
              setIsKnownSample(false);
              setMonth1('');
              setMonth2('');
              setMonth3('');
            }}
          />

          {hasUploadedPdf && !isKnownSample && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              ⚠️ This document could not be parsed automatically. Please enter your 3 monthly balances manually below
              as a simple test case. Full PDF OCR/parsing available in future sprint
            </p>
          )}

          {hasUploadedPdf && (
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm text-slate-700">
                Month 1 Balance ($)
                <input
                  type="number"
                  value={month1}
                  onChange={(event) => setMonth1(event.target.value)}
                  readOnly={isKnownSample}
                  className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-bv-blue focus:outline-none focus:ring-2 focus:ring-bv-blue/20 ${
                    isKnownSample ? 'bg-slate-100 text-slate-500' : 'bg-white'
                  }`}
                  required
                />
              </label>
              <label className="text-sm text-slate-700">
                Month 2 Balance ($)
                <input
                  type="number"
                  value={month2}
                  onChange={(event) => setMonth2(event.target.value)}
                  readOnly={isKnownSample}
                  className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-bv-blue focus:outline-none focus:ring-2 focus:ring-bv-blue/20 ${
                    isKnownSample ? 'bg-slate-100 text-slate-500' : 'bg-white'
                  }`}
                  required
                />
              </label>
              <label className="text-sm text-slate-700">
                Month 3 Balance ($)
                <input
                  type="number"
                  value={month3}
                  onChange={(event) => setMonth3(event.target.value)}
                  readOnly={isKnownSample}
                  className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-bv-blue focus:outline-none focus:ring-2 focus:ring-bv-blue/20 ${
                    isKnownSample ? 'bg-slate-100 text-slate-500' : 'bg-white'
                  }`}
                  required
                />
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !hasUploadedPdf}
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
            <button
              type="button"
              className="mt-4 rounded-lg bg-bv-blue px-4 py-2 text-sm font-semibold text-white hover:bg-bv-blue/90"
              onClick={() => navigate('/dashboard')}
            >
              Return to Dashboard
            </button>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">📄 Download sample bank statements to test:</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              ✅{' '}
              <a className="text-bv-blue underline hover:text-bv-blue/90" href="/samples/statement_pass_high.pdf" download>
                statement_pass_high.pdf
              </a>{' '}
              — All months well above threshold
            </li>
            <li>
              ✅{' '}
              <a
                className="text-bv-blue underline hover:text-bv-blue/90"
                href="/samples/statement_pass_borderline.pdf"
                download
              >
                statement_pass_borderline.pdf
              </a>{' '}
              — Just barely qualifies
            </li>
            <li>
              ❌{' '}
              <a className="text-bv-blue underline hover:text-bv-blue/90" href="/samples/statement_fail.pdf" download>
                statement_fail.pdf
              </a>{' '}
              — Month 2 fails threshold
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default UpgradeToPrime;
