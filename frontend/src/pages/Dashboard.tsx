import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  verifiedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

function Dashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<EligibilityStatus | null>(null);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          navigate('/login', { replace: true });
          return;
        }
        if (axiosError.response?.status === 404) {
          return;
        }
        setError('Unable to load eligibility status.');
      }
    };

    void loadStatus();
  }, [navigate, user]);

  const hasEvaluation = Boolean(status);
  const displayTier = status?.tier || user?.tier || 'RETAIL';
  const stellarExplorerUrl = status?.stellarTxHash
    ? `https://stellar.expert/explorer/testnet/tx/${status.stellarTxHash}`
    : '#';
  const proofDisplay = status?.proofHash ? `${status.proofHash.slice(0, 12)}...${status.proofHash.slice(-8)}` : 'N/A';
  const verificationTimestamp = status?.verifiedAt || status?.updatedAt || status?.createdAt;
  const verificationDate = verificationTimestamp ? new Date(verificationTimestamp).toLocaleDateString() : 'N/A';
  const navItems = [
    { label: 'Dashboard', href: '/dashboard', active: true },
    { label: 'Marketplace', href: '#', active: false },
    { label: 'Portfolio', href: '#', active: false },
    { label: 'Wallet', href: '#', active: false },
    { label: 'Secondary Market', href: '#', active: false },
    { label: 'Notifications', href: '#', active: false },
    { label: 'Settings', href: '#', active: false },
  ];
  const investments = [
    { asset: 'Lagos Commercial Tower', amount: '$2,000', tokens: '120 BV-LAG', status: 'CONFIRMED', date: 'Apr 14, 2026' },
    { asset: 'Abuja Solar Farm', amount: '$1,500', tokens: '85 BV-ABJ', status: 'PENDING', date: 'Apr 09, 2026' },
    {
      asset: 'Port Harcourt Industrial Park',
      amount: '$3,200',
      tokens: '210 BV-PHC',
      status: 'CONFIRMED',
      date: 'Mar 31, 2026',
    },
    { asset: 'Kano Logistics Hub', amount: '$900', tokens: '58 BV-KAN', status: 'CONFIRMED', date: 'Mar 17, 2026' },
  ] as const;

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <button
        type="button"
        onClick={() => setSidebarOpen((value) => !value)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm md:hidden"
        aria-label="Toggle sidebar"
      >
        ☰
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white p-5 transition-transform md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <img src="https://buildvest.net/buildvest-logo.png" alt="BuildVest" className="mb-8 h-8" />
        <nav className="space-y-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                item.active
                  ? 'bg-bv-blue/5 text-bv-blue'
                  : 'text-slate-600 transition hover:bg-slate-100 hover:text-slate-900'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="my-4 border-t border-slate-200" />
        <nav className="space-y-1">
          <a
            href="/eligibility"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            ZK Eligibility
          </a>
          <a
            href={stellarExplorerUrl}
            target={status?.stellarTxHash ? '_blank' : undefined}
            rel={status?.stellarTxHash ? 'noreferrer' : undefined}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
              status?.stellarTxHash
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'cursor-not-allowed text-slate-400'
            }`}
          >
            Stellar Explorer
          </a>
        </nav>
        <div className="my-4 border-t border-slate-200" />
        <button
          type="button"
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
          onClick={logout}
        >
          Logout
        </button>
      </aside>

      <main className="md:pl-72">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-xl font-semibold">Welcome back, {user?.email || 'investor@buildvest.com'}</h1>
            <div className="flex items-center gap-3">
              <a href="#" className="rounded-lg border border-slate-300 px-3 py-2 text-slate-500 hover:text-slate-700">
                🔔
              </a>
              <button
                type="button"
                className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white"
                onClick={logout}
              >
                {user?.email?.slice(0, 2) || 'BV'}
              </button>
            </div>
          </div>

          <section
            className={`rounded-2xl border p-6 shadow-sm ${
              !hasEvaluation
                ? 'border-slate-300 bg-white'
                : displayTier === 'PRIME'
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-bv-blue/20 bg-bv-blue/5'
            }`}
          >
            {!hasEvaluation && (
              <div>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                  UNVERIFIED
                </span>
                <h2 className="mt-3 text-2xl font-bold">Verification Pending</h2>
                <p className="mt-2 text-slate-600">Verify Eligibility →</p>
                <a
                  href="/eligibility"
                  className="mt-4 inline-flex rounded-lg bg-bv-blue px-4 py-2 text-sm font-semibold text-white hover:bg-bv-blue/50"
                >
                  Verify Eligibility
                </a>
              </div>
            )}
            {hasEvaluation && displayTier === 'PRIME' && (
              <div>
                <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
                  PRIME INVESTOR ✦
                </span>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">ZK-Verified Premium Access</h2>
              </div>
            )}
            {hasEvaluation && displayTier === 'RETAIL' && (
              <div>
                <span className="rounded-full bg-bv-blue/20 px-3 py-1 text-xs font-semibold text-bv-blue">
                  RETAIL INVESTOR
                </span>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">Standard access</h2>
              </div>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">NGN Wallet</p>
                  <p className="mt-2 text-3xl font-bold">₦0.00</p>
                  <p className="text-sm text-slate-500">Nigerian Naira</p>
                </div>
                <span className="text-2xl">💳</span>
              </div>
              <div className="mt-5 flex gap-3">
                <a href="#" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Deposit
                </a>
                <a href="#" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Withdraw
                </a>
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">USDC Wallet</p>
                  <p className="mt-2 text-3xl font-bold">$0.00</p>
                  <p className="text-sm text-slate-500">USD Coin</p>
                </div>
                <span className="text-2xl">🪙</span>
              </div>
              <div className="mt-5 flex gap-3">
                <a href="#" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Deposit
                </a>
                <a href="#" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Withdraw
                </a>
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Recent Investments</h2>
              <a href="#" className="text-sm font-semibold text-bv-blue hover:text-bv-blue/80">
                View All
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-3 pr-4 font-medium">Asset</th>
                    <th className="py-3 pr-4 font-medium">Amount</th>
                    <th className="py-3 pr-4 font-medium">Tokens</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map((item) => (
                    <tr key={`${item.asset}-${item.date}`} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium text-slate-800">{item.asset}</td>
                      <td className="py-3 pr-4 text-slate-600">{item.amount}</td>
                      <td className="py-3 pr-4 text-slate-600">{item.tokens}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            item.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">{item.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">ZK Verification Status</h2>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-800">Last verification:</span> {verificationDate}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Verification method:</span>{' '}
                {status?.verificationMethod || 'Noir ZK Proof'}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Proof hash:</span> {proofDisplay}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Stellar transaction:</span>{' '}
                {status?.stellarTxHash ? (
                  <a href={stellarExplorerUrl} target="_blank" rel="noreferrer" className="text-bv-blue hover:text-bv-blue/80">
                    View on Explorer
                  </a>
                ) : (
                  'N/A'
                )}
              </p>
            </div>
            <a
              href="/eligibility"
              className="mt-5 inline-flex rounded-lg bg-bv-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-bv-blue/50"
            >
              Re-verify
            </a>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
