import { useEffect, useState } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import {
  WaveIcon, ChartIcon, FireIcon, LinkIcon, CheckIcon,
  TrophyIcon, GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon, SearchIcon
} from '../components/icons/IceIcons';

export default function Home() {
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();
  const [userName, setUserName] = useState<string>('User');

  useEffect(() => {
    // Get user info from Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setUserName(user.first_name || user.username || 'User');
      }
    }
  }, []);

  const handleConnectWallet = async () => {
    try {
      await tonConnectUI.openModal();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Welcome Section */}
      <div className="card-glass">
        <div className="flex items-center space-x-3 mb-4">
          <WaveIcon size={40} />
          <div>
            <h2 className="text-2xl font-bold">Hello, {userName}!</h2>
            <p className="text-gray-400 text-sm">Welcome back</p>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ChartIcon size={22} />
          Your Stats
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-dark-400 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Points</div>
            <div className="text-2xl font-bold gradient-text">0</div>
          </div>
          <div className="bg-dark-400 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Rank</div>
            <div className="text-2xl font-bold text-primary-500">—</div>
          </div>
          <div className="bg-dark-400 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">NFTs</div>
            <div className="text-2xl font-bold text-primary-500">0</div>
          </div>
          <div className="bg-dark-400 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Streak</div>
            <div className="text-2xl font-bold flex items-center gap-1">
              <FireIcon size={24} />
              <span>0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Connect Wallet */}
      {!userAddress ? (
        <button
          onClick={handleConnectWallet}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          <LinkIcon size={20} />
          <span>Connect TON Wallet</span>
        </button>
      ) : (
        <div className="card bg-cyan-500/10 border border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">Connected Wallet</div>
              <div className="font-mono text-sm">
                {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </div>
            </div>
            <CheckIcon size={36} />
          </div>
        </div>
      )}

      {/* Top 3 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrophyIcon size={22} />
          Top 3
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-dark-400 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <GoldMedalIcon size={28} />
              <div>
                <div className="font-semibold">@User1</div>
                <div className="text-sm text-gray-400">10,000 points</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between bg-dark-400 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <SilverMedalIcon size={28} />
              <div>
                <div className="font-semibold">@User2</div>
                <div className="text-sm text-gray-400">8,500 points</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between bg-dark-400 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <BronzeMedalIcon size={28} />
              <div>
                <div className="font-semibold">@User3</div>
                <div className="text-sm text-gray-400">7,200 points</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-secondary flex flex-col items-center">
          <div className="mb-1"><TrophyIcon size={28} /></div>
          <div className="text-sm">View Leaderboard</div>
        </button>
        <button className="btn-secondary flex flex-col items-center">
          <div className="mb-1"><SearchIcon size={28} /></div>
          <div className="text-sm">Find My Rank</div>
        </button>
      </div>
    </div>
  );
}
