import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="mb-4 inline-block rounded-full border border-indigo-400/40 bg-indigo-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
              Stellar Build Weekend Residency Hackathon
            </p>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl">
              BuildVest ZK — Privacy-Preserving Investor Eligibility
            </h1>
            <p className="mt-6 text-lg text-gray-300 md:text-xl">
              Prove you qualify as a PRIME investor without revealing your bank balances. Powered by Noir ZK
              proofs, verified on Stellar.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/auth"
                className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-500 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:from-indigo-500 hover:to-violet-400"
              >
                Get Started
              </Link>
              <a
                href="#how-it-works"
                className="rounded-lg border border-gray-600 bg-gray-800/70 px-6 py-3 font-semibold text-gray-100 transition hover:border-gray-500 hover:bg-gray-700"
              >
                View Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-bold text-white">How It Works</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-lg">
            <div className="text-3xl">📄</div>
            <h3 className="mt-4 text-xl font-semibold">Upload Bank Statement</h3>
            <p className="mt-2 text-sm text-gray-400">Provide statement data to start eligibility evaluation.</p>
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-lg">
            <div className="text-3xl">🔒</div>
            <h3 className="mt-4 text-xl font-semibold">ZK Proof Generated</h3>
            <p className="mt-2 text-sm text-gray-400">Noir-powered proof confirms threshold checks privately.</p>
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-lg">
            <div className="text-3xl">⛓️</div>
            <h3 className="mt-4 text-xl font-semibold">Verified On-Chain</h3>
            <p className="mt-2 text-sm text-gray-400">Proof reference is anchored and verifiable on Stellar testnet.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800 px-6 py-8 text-center text-sm text-gray-400">
        Built for Stellar Build Weekend Residency Hackathon · BuildVest Team · 2026
      </footer>
    </div>
  );
}

export default Landing;
