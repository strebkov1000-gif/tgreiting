import Prize from '../components/icons/Prize';

export default function Prizes() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Prize size={32} />
        <h1 className="text-2xl font-bold gradient-text">Prizes</h1>
      </div>

      {/* Coming Soon Card */}
      <div className="card text-center py-16">
        <div className="w-24 h-24 bg-blue-500/10 rounded-full mx-auto mb-6 flex items-center justify-center border border-blue-500/30 animate-pulse">
          <Prize size={48} />
        </div>
        <h2 className="text-2xl font-bold mb-3">Coming Soon!</h2>
        <p className="text-gray-400 mb-8 max-w-sm mx-auto">
          Exciting prizes are being prepared for our top contributors. Stay active and climb the leaderboard!
        </p>
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-6 py-3">
          <span className="text-xl">🚀</span>
          <span className="font-semibold text-blue-300">Stay tuned</span>
        </div>
      </div>

      {/* Prize Preview */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">What to expect</h3>
        <div className="space-y-3">
          {[
            { icon: '🏆', title: 'Weekly Rewards', desc: 'Top players get exclusive rewards every week' },
            { icon: '💎', title: 'Exclusive NFTs', desc: 'Rare collectibles for dedicated participants' },
            { icon: '🎯', title: 'Special Achievements', desc: 'Unlock unique badges and bonuses' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-2xl">
                {item.icon}
              </div>
              <div>
                <div className="font-semibold">{item.title}</div>
                <div className="text-sm text-gray-500">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
