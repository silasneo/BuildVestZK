type Tier = 'RETAIL' | 'PRIME';

interface TierBadgeProps {
  tier: Tier;
}

function TierBadge({ tier }: TierBadgeProps) {
  if (tier === 'PRIME') {
    return (
      <div className="rounded-2xl border border-emerald-300/40 bg-gradient-to-r from-amber-300 via-yellow-300 to-emerald-300 px-6 py-5 text-center text-2xl font-bold text-gray-900 shadow-lg shadow-emerald-500/20">
        ⭐ PRIME Investor
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-600 bg-gray-800 px-6 py-5 text-center text-2xl font-bold text-gray-100 shadow-lg">
      📊 RETAIL Investor
    </div>
  );
}

export default TierBadge;
