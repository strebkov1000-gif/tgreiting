import { useEffect, useState } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import {
  WaveIcon, ChartIcon, LinkIcon, CheckIcon,
  TrophyIcon, GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon
} from '../components/icons/IceIcons';

const API_URL = import.meta.env.VITE_API_URL || 'https://icetop.app/api';

interface UserStats {
  totalPoints: number;
  rank: number | null;
  nftCount: number;
}

interface LeaderboardUser {
  rank: number;
  username: string | null;
  firstName: string | null;
  value: number;
}

export default function Home() {
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();
  const [userName, setUserName] = useState<string>('User');
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [top3, setTop3] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setUserName(user.first_name || user.username || 'User');
        setTelegramId(user.id.toString());
      }
    }
  }, []);

  useEffect(() => {
    if (telegramId) {
      fetchUserStats();
      fetchTop3();
    }
  }, [telegramId]);

  const getInitData = () => {
    return window.Telegram?.WebApp?.initData || '';
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch(`${API_URL}/user/${telegramId}/stats`, {
        headers: { 'x-telegram-init-data': getInitData() }
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalPoints: data.stats.totalPoints,
          rank: data.stats.rank,
          nftCount: data.stats.nftCount
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTop3 = async () => {
    try {
      const response = await fetch(`${API_URL}/leaderboard/mountain`);

      if (response.ok) {
        const data = await response.json();
        setTop3(data.podium?.slice(0, 3) || []);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const handleConnectWallet = async () => {
    try {
      await tonConnectUI.openModal();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1: return <GoldMedalIcon size={28} />;
      case 2: return <SilverMedalIcon size={28} />;
      case 3: return <BronzeMedalIcon size={28} />;
      default: return null;
    }
  };

  const formatName = (user: LeaderboardUser) => {
    if (user.username) return `@${user.username}`;
    if (user.firstName) return user.firstName;
    return 'User';
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
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-dark-400 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Points</div>
            <div className="text-2xl font-bold gradient-text">
              {loading ? '...' : stats?.totalPoints || 0}
            </div>
          </div>
          <div className="bg-dark-400 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Rank</div>
            <div className="text-2xl font-bold text-primary-500">
              {loading ? '...' : stats?.rank ? `#${stats.rank}` : '—'}
            </div>
          </div>
          <div className="bg-dark-400 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">NFTs</div>
            <div className="text-2xl font-bold text-primary-500">
              {loading ? '...' : stats?.nftCount || 0}
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
          {top3.length > 0 ? (
            top3.map((user, index) => (
              <div key={index} className="flex items-center justify-between bg-dark-400 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  {getMedalIcon(user.rank)}
                  <div>
                    <div className="font-semibold">{formatName(user)}</div>
                    <div className="text-sm text-gray-400">{user.value.toLocaleString()} meters</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center justify-between bg-dark-400 rounded-xl p-4 animate-pulse">
                <div className="flex items-center space-x-3">
                  <GoldMedalIcon size={28} />
                  <div className="h-4 w-24 bg-gray-600 rounded" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-dark-400 rounded-xl p-4 animate-pulse">
                <div className="flex items-center space-x-3">
                  <SilverMedalIcon size={28} />
                  <div className="h-4 w-24 bg-gray-600 rounded" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-dark-400 rounded-xl p-4 animate-pulse">
                <div className="flex items-center space-x-3">
                  <BronzeMedalIcon size={28} />
                  <div className="h-4 w-24 bg-gray-600 rounded" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
