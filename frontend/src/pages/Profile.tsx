import { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import Snowman from '../components/icons/Snowman';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export default function Profile() {
  const userAddress = useTonAddress();
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    // Get user info from Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const userData = tg.initDataUnsafe?.user;
      if (userData) {
        setUser(userData as TelegramUser);
      }
    }
  }, []);

  const displayName = user?.username
    ? `@${user.username}`
    : user?.first_name
      ? user.first_name
      : 'User';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Profile Header */}
      <div className="card text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-blue-500/50 shadow-[0_0_20px_rgba(33,150,243,0.4)] overflow-hidden">
          {user?.photo_url ? (
            <img
              src={user.photo_url}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <Snowman size={56} />
          )}
        </div>
        <h2 className="text-2xl font-bold mb-1">{displayName}</h2>
        {userAddress && (
          <div className="inline-flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 mt-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm text-gray-400 font-mono">
              {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
            </span>
          </div>
        )}
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card text-center">
          <div className="text-2xl font-bold gradient-text">0</div>
          <div className="text-xs text-gray-500 mt-1">Total Points</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-2xl font-bold text-blue-400">#—</div>
          <div className="text-xs text-gray-500 mt-1">Current Rank</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-2xl font-bold text-white">0</div>
          <div className="text-xs text-gray-500 mt-1">Referrals</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-2xl font-bold text-orange-400">0</div>
          <div className="text-xs text-gray-500 mt-1">Day Streak</div>
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>🏅</span>
            Achievements
          </h3>
          <span className="badge">0/10</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-white/5 rounded-xl flex items-center justify-center text-2xl border border-white/5 opacity-40"
            >
              🔒
            </div>
          ))}
        </div>
      </div>

      {/* Referral Link */}
      <div className="card border-blue-500/20">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🎁</span>
          Invite Friends
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Share your link and earn bonus points for each friend who joins!
        </p>
        <div className="bg-[#081220]/80 rounded-xl p-3 mb-4 font-mono text-sm text-gray-300 break-all border border-white/5">
          t.me/ice_bot?start=ABC123
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-secondary text-sm py-2.5">
            Copy Link
          </button>
          <button className="btn-primary text-sm py-2.5">
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
