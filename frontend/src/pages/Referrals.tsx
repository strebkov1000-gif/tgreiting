export default function Referrals() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <span className="mr-2">👥</span>
          Referral Program
        </h2>

        {/* Referral Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-dark-400 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold gradient-text">0</div>
            <div className="text-xs text-gray-400 mt-1">Total Referrals</div>
          </div>
          <div className="bg-dark-400 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-primary-500">0</div>
            <div className="text-xs text-gray-400 mt-1">Active</div>
          </div>
          <div className="bg-dark-400 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-500">0</div>
            <div className="text-xs text-gray-400 mt-1">Points Earned</div>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-gradient-to-r from-primary-500/20 to-primary-600/20 border border-primary-500/30 rounded-xl p-4 mb-6">
          <div className="text-sm text-gray-400 mb-2">Your Referral Link</div>
          <div className="bg-dark-400 rounded-lg p-3 mb-3 font-mono text-sm break-all">
            t.me/ice_bot?start=ABC123
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary text-sm py-2">
              📋 Copy Link
            </button>
            <button className="btn-primary text-sm py-2">
              📤 Share Link
            </button>
          </div>
        </div>

        {/* Rewards Info */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center">
            <span className="mr-2">🎁</span>
            Referral Rewards
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-dark-400 rounded-xl p-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">👋</span>
                <span className="text-sm">Friend joins</span>
              </div>
              <span className="font-bold text-primary-500">+50 pts</span>
            </div>
            <div className="flex items-center justify-between bg-dark-400 rounded-xl p-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🔗</span>
                <span className="text-sm">Friend connects wallet</span>
              </div>
              <span className="font-bold text-primary-500">+50 pts</span>
            </div>
            <div className="flex items-center justify-between bg-dark-400 rounded-xl p-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🎨</span>
                <span className="text-sm">Friend gets first NFT</span>
              </div>
              <span className="font-bold text-primary-500">+100 pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Referral List */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center">
          <span className="mr-2">📋</span>
          Your Referrals
        </h3>
        <div className="text-center py-12 text-gray-400">
          <div className="text-6xl mb-4">👥</div>
          <p>No referrals yet</p>
          <p className="text-sm mt-2">Share your link to start earning!</p>
        </div>
      </div>
    </div>
  );
}
