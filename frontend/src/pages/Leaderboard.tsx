import { useState, useEffect } from 'react';
import SnowMountain from '../components/icons/SnowMountain';

interface MountainUser {
  rank: number;
  user_id: string;
  telegram_id: string;
  username: string | null;
  first_name: string | null;
  avatar_url: string | null;
  value: number;
  is_me?: boolean;
}

interface MetricInfo {
  id: string;
  label: string;
  display_name: string;
}

interface LeaderboardData {
  metric: MetricInfo;
  podium: MountainUser[];
  list: MountainUser[];
  me: { rank: number; value: number } | null;
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
    total: number;
  };
}

const API_URL = import.meta.env.VITE_API_URL || 'https://icetop.app/api';

export default function Leaderboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get Telegram initData for authentication
      const initData = window.Telegram?.WebApp?.initData || '';

      const response = await fetch(`${API_URL}/leaderboard/mountain`, {
        headers: {
          'x-telegram-init-data': initData,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      case 4: return '4️⃣';
      case 5: return '5️⃣';
      default: return null;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'border-yellow-500 bg-yellow-500/10';
      case 2: return 'border-gray-400 bg-gray-400/10';
      case 3: return 'border-amber-600 bg-amber-600/10';
      default: return 'border-blue-500/30 bg-blue-500/5';
    }
  };

  const getMountainHeight = (rank: number) => {
    switch (rank) {
      case 1: return 'h-32';
      case 2: return 'h-24';
      case 3: return 'h-20';
      case 4: return 'h-16';
      case 5: return 'h-14';
      default: return 'h-12';
    }
  };

  const getDisplayName = (user: MountainUser) => {
    if (user.username) return `@${user.username}`;
    if (user.first_name) return user.first_name;
    return 'User';
  };

  const UserAvatar = ({ user, size = 'md' }: { user: MountainUser; size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-lg',
      lg: 'w-12 h-12 text-xl',
    };

    if (user.avatar_url) {
      return (
        <img
          src={user.avatar_url}
          alt={getDisplayName(user)}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      );
    }

    return (
      <div className={`${sizeClasses[size]} bg-[#122240] rounded-full flex items-center justify-center`}>
        👤
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-4xl animate-bounce mb-4">⛰️</div>
          <p className="text-gray-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="card text-center">
          <p className="text-red-400 mb-4">{error || 'Failed to load data'}</p>
          <button onClick={fetchLeaderboard} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { metric, podium, list, me } = data;

  // Reorder podium for visual effect: 4, 2, 1, 3, 5
  const orderedPodium = podium.length >= 5
    ? [podium[3], podium[1], podium[0], podium[2], podium[4]]
    : podium;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <SnowMountain size={32} />
          <span className="gradient-text">Top</span>
        </h1>
        <div className="text-sm text-gray-400">
          {metric.display_name}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Find your rank..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-12"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
          🔍
        </span>
      </div>

      {/* Mountain Podium - Top 5 */}
      {podium.length > 0 && (
        <div className="card overflow-hidden">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>⛰️</span>
            Summit Top 5
          </h2>

          {/* Mountain visualization */}
          <div className="relative">
            {/* Mountain background gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 via-blue-800/10 to-transparent rounded-xl" />

            {/* Podium entries */}
            <div className="flex items-end justify-center gap-2 pt-4 pb-2 px-2">
              {orderedPodium.map((user) => {
                const actualRank = user.rank;

                return (
                  <div
                    key={user.user_id}
                    className={`flex flex-col items-center transition-all duration-300 ${
                      actualRank === 1 ? 'z-10' : ''
                    }`}
                    style={{ flex: actualRank === 1 ? '1.2' : '1' }}
                  >
                    {/* User info */}
                    <div className={`text-center mb-2 ${user.is_me ? 'animate-pulse' : ''}`}>
                      {/* Avatar */}
                      <div className="flex justify-center mb-1">
                        <UserAvatar user={user} size="sm" />
                      </div>
                      <div className="text-2xl mb-1">{getRankIcon(actualRank)}</div>
                      <div className={`text-xs font-medium truncate max-w-[60px] ${
                        user.is_me ? 'text-blue-400' : 'text-gray-300'
                      }`}>
                        {getDisplayName(user)}
                      </div>
                      <div className={`text-sm font-bold ${
                        actualRank === 1 ? 'text-yellow-400' :
                        user.is_me ? 'text-blue-400' : 'text-white'
                      }`}>
                        {user.value.toLocaleString()}{metric.label}
                      </div>
                    </div>

                    {/* Mountain bar */}
                    <div
                      className={`w-full ${getMountainHeight(actualRank)} rounded-t-lg border-t-2 border-x-2 ${getRankStyle(actualRank)} ${
                        user.is_me ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                      }`}
                      style={{
                        background: `linear-gradient(to top, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.1))`
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Mountain base */}
            <div className="h-2 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent rounded-b-xl" />
          </div>
        </div>
      )}

      {/* Leaderboard List - Rank 6+ */}
      {list.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📋</span>
            Climbing...
          </h2>

          <div className="space-y-2">
            {list.map((user) => (
              <div
                key={user.user_id}
                className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${
                  user.is_me
                    ? 'bg-blue-500/15 border border-blue-500/40'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-lg font-bold w-8 ${
                    user.is_me ? 'text-blue-400' : 'text-gray-500'
                  }`}>
                    #{user.rank}
                  </div>
                  <UserAvatar user={user} size="md" />
                  <div>
                    <div className={`font-semibold ${
                      user.is_me ? 'text-white' : 'text-gray-200'
                    }`}>
                      {getDisplayName(user)}
                      {user.is_me && (
                        <span className="text-blue-400 text-xs ml-1">(you)</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    user.is_me ? 'text-blue-300' : 'text-white'
                  }`}>
                    {user.value.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">{metric.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {data.pagination.has_more && (
            <button className="w-full btn-secondary mt-6">
              Load More
            </button>
          )}
        </div>
      )}

      {/* My Position (if not in visible list) */}
      {me && (
        <div className="card border-blue-500/30">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span>📍</span>
            Your Position
          </h2>
          <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-blue-400">#{me.rank}</div>
              <div>
                <div className="font-semibold text-white">You</div>
                <div className="text-sm text-gray-400">
                  {me.rank <= 10 ? 'Top 10' : me.rank <= 100 ? 'Top 100' : `Top ${Math.ceil(me.rank / data.pagination.total * 100)}%`} of climbers
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-300">{me.value.toLocaleString()}</div>
              <div className="text-sm text-gray-500">{metric.label}</div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {podium.length === 0 && list.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">🏔️</div>
          <p className="text-gray-400">No climbers yet. Be the first!</p>
        </div>
      )}
    </div>
  );
}
