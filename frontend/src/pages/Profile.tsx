import { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import Snowman from '../components/icons/Snowman';
import { MedalIcon, LockIcon, GiftIcon } from '../components/icons/IceIcons';

const API_URL = import.meta.env.VITE_API_URL || 'https://icetop.app/api';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface UserProfile {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  referralCode: string;
  totalPoints: number;
  currentStreak: number;
  maxStreak: number;
  rank: number | null;
  counts: {
    referrals: number;
    achievements: number;
  };
}

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  pointsReward: number;
  category: string;
  unlocked: boolean;
  unlockedAt?: string;
}

interface AchievementsData {
  achievements: Achievement[];
  stats: {
    unlockedCount: number;
    totalCount: number;
    percentage: number;
  };
}

export default function Profile() {
  const userAddress = useTonAddress();
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const userData = tg.initDataUnsafe?.user;
      if (userData) {
        setUser(userData as TelegramUser);
        fetchProfile(userData.id);
        fetchAchievements(userData.id);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchProfile = async (telegramId: number) => {
    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData || '';

      const response = await fetch(`${API_URL}/user/${telegramId}`, {
        headers: { 'x-telegram-init-data': initData },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAchievements = async (telegramId: number) => {
    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData || '';

      const response = await fetch(`${API_URL}/achievements/${telegramId}`, {
        headers: { 'x-telegram-init-data': initData },
      });

      if (response.ok) {
        const data = await response.json();
        setAchievements(data);
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
  };

  const getReferralLink = () => {
    if (!profile?.referralCode) return null;
    const botUsername = import.meta.env.VITE_BOT_USERNAME || 'IceTopbot';
    return `https://t.me/${botUsername}?start=${profile.referralCode}`;
  };

  const handleCopyLink = async () => {
    const link = getReferralLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setToast('Link copied!');
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setToast('Link copied!');
    }
  };

  const handleShare = () => {
    const link = getReferralLink();
    if (!link) return;

    const tg = window.Telegram?.WebApp;
    const shareText = `Join IceTop and climb the mountain with me! 🧊⛰️\n\n${link}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join IceTop and climb the mountain with me! 🧊⛰️')}`;

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else if (navigator.share) {
      navigator.share({ title: 'Join IceTop', text: shareText, url: link }).catch(() => handleCopyLink());
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const displayName = user?.username ? `@${user.username}` : user?.first_name || 'User';
  const referralLink = getReferralLink();
  const displayLink = referralLink || 't.me/IceTopbot?start=...';

  // Get featured achievements (first 8, prioritizing unlocked)
  const getFeaturedAchievements = () => {
    if (!achievements?.achievements) return [];
    const sorted = [...achievements.achievements].sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return 0;
    });
    return sorted.slice(0, 8);
  };

  const featuredAchievements = getFeaturedAchievements();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d2137] to-[#0a1929]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* Achievement Modal */}
      {selectedAchievement && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAchievement(null)}
        >
          <div
            className={`bg-gradient-to-b from-[#0c1c2e] to-[#0a1929] rounded-2xl p-6 max-w-sm w-full border ${
              selectedAchievement.unlocked
                ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)]'
                : 'border-cyan-800/50'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center text-4xl ${
              selectedAchievement.unlocked
                ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30 shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                : 'bg-cyan-950/50 grayscale opacity-50'
            }`}>
              {selectedAchievement.icon}
            </div>
            <h3 className="text-xl font-bold text-center mb-2 text-cyan-100">
              {selectedAchievement.name}
            </h3>
            <p className="text-cyan-600 text-center text-sm mb-4">
              {selectedAchievement.description}
            </p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-yellow-500 font-bold">+{selectedAchievement.pointsReward}</span>
              <span className="text-cyan-700 text-sm">meters</span>
            </div>
            {selectedAchievement.unlocked && selectedAchievement.unlockedAt && (
              <p className="text-center text-xs text-emerald-500">
                Unlocked {new Date(selectedAchievement.unlockedAt).toLocaleDateString()}
              </p>
            )}
            {!selectedAchievement.unlocked && (
              <p className="text-center text-xs text-cyan-700">
                Keep climbing to unlock!
              </p>
            )}
            <button
              onClick={() => setSelectedAchievement(null)}
              className="w-full mt-4 btn-secondary text-sm py-2"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="card text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.4)] overflow-hidden">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <Snowman size={56} />
          )}
        </div>
        <h2 className="text-2xl font-bold mb-1 text-cyan-100">{displayName}</h2>
        {userAddress && (
          <div className="inline-flex items-center gap-2 bg-cyan-950/50 rounded-full px-4 py-1.5 mt-2 border border-cyan-800/30">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm text-cyan-400 font-mono">
              {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
            </span>
          </div>
        )}
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <div className="text-2xl font-bold text-cyan-400">
            {loading ? '...' : profile?.rank ? `#${profile.rank}` : '#—'}
          </div>
          <div className="text-xs text-cyan-600 mt-1">Current Rank</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-2xl font-bold text-cyan-300">
            {loading ? '...' : profile?.counts?.referrals || 0}
          </div>
          <div className="text-xs text-cyan-600 mt-1">Referrals</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-2xl font-bold text-orange-400">
            {loading ? '...' : profile?.currentStreak || 0}
          </div>
          <div className="text-xs text-cyan-600 mt-1">Day Streak</div>
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-cyan-200">
            <MedalIcon size={22} className="text-cyan-400" />
            Achievements
          </h3>
          <span className="badge">
            {achievements ? `${achievements.stats.unlockedCount}/${achievements.stats.totalCount}` : '...'}
          </span>
        </div>

        {/* Achievement grid */}
        <div className="grid grid-cols-4 gap-3">
          {featuredAchievements.length > 0 ? (
            featuredAchievements.map((achievement) => (
              <button
                key={achievement.id}
                onClick={() => setSelectedAchievement(achievement)}
                className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all duration-300 ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:scale-105'
                    : 'bg-cyan-950/50 border border-cyan-800/30 opacity-50 hover:opacity-70 hover:border-cyan-600/30'
                }`}
              >
                {achievement.unlocked ? (
                  <span className="drop-shadow-lg">{achievement.icon}</span>
                ) : (
                  <LockIcon size={24} className="text-cyan-600" />
                )}
              </button>
            ))
          ) : (
            [...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-cyan-950/50 rounded-xl flex items-center justify-center border border-cyan-800/30 opacity-50"
              >
                <LockIcon size={24} className="text-cyan-600" />
              </div>
            ))
          )}
        </div>

      </div>

      {/* Referral Link */}
      <div className="card border-cyan-500/20">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-cyan-200">
          <GiftIcon size={22} className="text-cyan-400" />
          Invite Friends
        </h3>
        <p className="text-sm text-cyan-600 mb-4">
          Share your link and earn bonus meters for each friend who joins!
        </p>
        <div className="bg-cyan-950/50 rounded-xl p-3 mb-4 font-mono text-sm text-cyan-300 break-all border border-cyan-800/30">
          {displayLink}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopyLink}
            disabled={!referralLink}
            className="btn-secondary text-sm py-2.5 disabled:opacity-50"
          >
            Copy Link
          </button>
          <button
            onClick={handleShare}
            disabled={!referralLink}
            className="btn-primary text-sm py-2.5 disabled:opacity-50"
          >
            Share
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
