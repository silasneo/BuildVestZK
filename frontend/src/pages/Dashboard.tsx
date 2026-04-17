import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProofStatus from '../components/ProofStatus';
import TierBadge from '../components/TierBadge';
import { getEligibilityStatus } from '../lib/api';

interface StoredUser {
  id: number;
  email: string;
  tier: 'RETAIL' | 'PRIME';
}

interface EligibilityStatus {
  tier: 'RETAIL' | 'PRIME';
  status: 'APPROVED' | 'REJECTED';
  qualified: boolean;
  proofHash: string | null;
  stellarTxHash: string | null;
  sorobanTxHash: string | null;
  verificationMethod: string | null;
}

function Dashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<EligibilityStatus | null>(null);
  const [error, setError] = useState('');

  const user = useMemo<StoredUser | null>(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await getEligibilityStatus();
        const data = response.data as EligibilityStatus | null;
        setStatus(data);

        if (data && user) {
          localStorage.setItem('user', JSON.stringify({ ...user, tier: data.tier }));
        }
      } catch (err) {
        const axiosError = err as AxiosError;
        if (axiosError.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          navigate('/auth', { replace: true });
          return;
        }
        setError('Unable to load eligibility status.');
      }
    };

    void loadStatus();
  }, [navigate, user]);

  const displayTier = status?.tier || user?.tier || 'RETAIL';

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-700 bg-gray-900 p-5">
          <h1 className="text-xl font-semibold">Welcome, {user?.email || 'Investor'}</h1>
          <button
            type="button"
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-600"
            onClick={() => {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('user');
              navigate('/auth');
            }}
          >
            Logout
          </button>
        </div>

        <TierBadge tier={displayTier} />

        <section className="rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Eligibility Status</h2>
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
              onClick={() => navigate('/upgrade')}
            >
              Upgrade to PRIME →
            </button>
          </div>

          {!status && !error && <p className="text-gray-300">No evaluation yet.</p>}
          {error && <p className="text-red-400">{error}</p>}

          {status?.status === 'REJECTED' && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
              Does not qualify for PRIME.
            </p>
          )}

          {status?.status === 'APPROVED' && (
            <ProofStatus
              proofHash={status.proofHash}
              stellarTxHash={status.stellarTxHash}
              sorobanTxHash={status.sorobanTxHash}
              verificationMethod={status.verificationMethod}
            />
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
