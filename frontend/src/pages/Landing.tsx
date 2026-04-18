import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = ['Marketplace', 'Investors', 'Originators', 'About'];
  const investments = [
    {
      name: 'Lagos Commercial Tower',
      type: 'Commercial Real Estate',
      apy: '14.2% APY',
      min: '$1,000',
      progress: 65,
      gradient: 'from-indigo-500 to-blue-400',
    },
    {
      name: 'Abuja Solar Farm',
      type: 'Renewable Energy',
      apy: '12.8% APY',
      min: '$1,500',
      progress: 82,
      gradient: 'from-cyan-500 to-emerald-400',
    },
    {
      name: 'Port Harcourt Industrial Park',
      type: 'Infrastructure',
      apy: '16.4% APY',
      min: '$2,000',
      progress: 45,
      gradient: 'from-violet-500 to-fuchsia-400',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header
        className={`sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur transition-shadow ${
          scrolled ? 'shadow-sm' : ''
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="text-2xl font-bold text-indigo-700">
            BuildVest
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            {navLinks.map((item) => (
              <a key={item} href="#" className="transition hover:text-indigo-700">
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 md:hidden"
            aria-label="Toggle navigation"
          >
            ☰
          </button>
        </div>

        {menuOpen && (
          <div className="space-y-3 border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            {navLinks.map((item) => (
              <a key={item} href="#" className="block text-sm font-medium text-slate-600">
                {item}
              </a>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                to="/login"
                className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.35),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              Invest in Real-World Assets with Zero-Knowledge Proof Verification
            </h1>
            <p className="mt-6 text-lg text-slate-200 md:text-xl">
              Verify your investment eligibility privately using ZK proofs, recorded on-chain via Stellar.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="rounded-lg bg-indigo-500 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-400"
              >
                Get Started
              </Link>
              <a
                href="#"
                className="rounded-lg border border-slate-500 bg-slate-900/50 px-6 py-3 font-semibold text-slate-100 transition hover:border-slate-300"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 flex items-end justify-between gap-4">
          <h2 className="text-3xl font-bold text-slate-900">Live Investment Opportunities</h2>
          <a href="#" className="text-sm font-semibold text-indigo-700 hover:text-indigo-600">
            See all opportunities →
          </a>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {investments.map((investment) => (
            <article
              key={investment.name}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className={`h-40 rounded-xl bg-gradient-to-br ${investment.gradient}`} />
              <div className="mt-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{investment.name}</h3>
                  <p className="text-sm text-slate-500">{investment.type}</p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {investment.apy}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-600">Minimum Investment: {investment.min}</p>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${investment.progress}%` }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">{investment.progress}% funded</p>
              <a
                href="#"
                className="mt-4 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700"
              >
                View Details
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900">Investment Tiers</h2>
            <p className="mt-3 text-slate-600">
              Zero-Knowledge Verified <span className="font-semibold">🔒</span>
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold tracking-wide text-slate-700">
                RETAIL
              </span>
              <h3 className="mt-4 text-2xl font-semibold text-slate-900">Retail Investor</h3>
              <p className="mt-2 text-slate-600">Standard access to the BuildVest marketplace</p>
              <p className="mt-4 text-sm font-medium text-slate-700">No minimum balance requirement</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>• Access to public listings</li>
                <li>• Standard investment limits</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold tracking-wide text-amber-800">
                  PRIME ✦
                </span>
                <span className="text-xs font-semibold text-indigo-700">Zero-Knowledge Verified</span>
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-slate-900">Prime Investor</h3>
              <p className="mt-2 text-slate-700">Premium access with ZK-verified eligibility</p>
              <p className="mt-4 text-sm font-medium text-slate-800">
                Minimum $1,000/month balance across 3 months, verified via zero-knowledge proof
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>• Early access to deals</li>
                <li>• Higher investment limits</li>
                <li>• Priority allocation</li>
                <li>• Managed deal access</li>
              </ul>
              <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                Your balances are never revealed — only the proof that you qualify.
              </p>
            </article>
          </div>
          <div className="mt-8">
            <Link
              to="/signup"
              className="inline-flex rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Check Your Eligibility
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:px-6">
          <div className="flex flex-wrap items-center gap-5">
            <a href="#" className="hover:text-indigo-700">
              About
            </a>
            <a href="#" className="hover:text-indigo-700">
              FAQ
            </a>
            <a href="#" className="hover:text-indigo-700">
              Legal
            </a>
            <a href="#" className="hover:text-indigo-700">
              Contact
            </a>
          </div>
          <p>© 2026 BuildVest. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
