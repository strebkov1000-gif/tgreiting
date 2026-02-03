import { useEffect, useState } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import Snowman from '../components/icons/Snowman';
import { useLanguage } from '../i18n/LanguageContext';
// v2.1 - Show all NFTs in hold bonus

const API_URL = import.meta.env.VITE_API_URL || 'https://icetop.app/api';
const BUILD_VERSION = '2.1.0';

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
  nftCount: number;
  rank: number | null;
  counts: {
    referrals: number;
    achievements: number;
    nfts: number;
  };
}

// Icons
const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LockIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
  </svg>
);

const UsersIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrophyIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 1012 0V2z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FireIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
  </svg>
);

const StickerIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.5 2h-13A2.5 2.5 0 003 4.5v15A2.5 2.5 0 005.5 22h9.086a2.5 2.5 0 001.768-.732l4.914-4.914A2.5 2.5 0 0022 14.586V4.5A2.5 2.5 0 0019.5 2h-1zm-13 2h13a.5.5 0 01.5.5v9h-4a2 2 0 00-2 2v4h-7.5a.5.5 0 01-.5-.5v-15a.5.5 0 01.5-.5z"/>
  </svg>
);

const ClockIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v6l4 2" strokeLinecap="round"/>
  </svg>
);

/* Temporarily disabled - will be enabled at end of season
const RefreshIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
*/

// Club image component with animation
const ClubImage = ({ src, alt, className = '' }: { src: string; alt: string; className?: string }) => (
  <img
    src={src}
    alt={alt}
    className={`${className} object-contain animate-club-float`}
  />
);

// SVG icon for section header
const IceGangIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v4m0 12v4M2 12h4m12 0h4M5.64 5.64l2.83 2.83m7.07 7.07l2.83 2.83M5.64 18.36l2.83-2.83m7.07-7.07l2.83-2.83"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
  </svg>
);

const ChevronDownIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface ClubItem {
  id: string;
  title: string;
  description: string;
  reward: string;
  maxReward: string;
  icon: 'ice' | 'notkep' | 'seal';
  gradient: string;
  status: 'available' | 'completed' | 'locked';
  chatLink: string;
  isHold?: boolean;
}

interface TaskItem {
  id: string;
  title: string;
  description: string;
  reward: string;
  icon: 'users' | 'trophy' | 'fire' | 'sticker' | 'clock';
  gradient: string;
  status: 'available' | 'completed' | 'locked';
  progress?: number;
  target?: number;
  action?: () => void;
}

// Hold Bonus interfaces
interface HoldBonusNft {
  nftId: string;
  name: string;
  collection: string;
  baseMeters: number;
  ownedSince: string; // Actual blockchain ownership date
  detectedAt: string; // When we first detected it (for reference)
  holdDays: number;
  holdMonths: number;
  bonusPercent: number;
  currentHoldBonus: number;
  potentialHoldBonus: number;
  tierName: string;
  daysUntilNextMonth: number | null;
}

interface HoldBonusData {
  totalHoldBonus: number;
  diamondHands: {
    eligible: boolean;
    awarded: boolean;
    bonus: number;
    daysUntil: number | null;
  };
  oldestNftDays: number;
  nfts: HoldBonusNft[];
}

export default function Profile() {
  const { t } = useLanguage();
  const userAddress = useTonAddress();
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  // Club check temporarily disabled - will be enabled at end of season
  const [checkingClub, _setCheckingClub] = useState<string | null>(null);
  const [clubStatuses, _setClubStatuses] = useState<Record<string, boolean>>({});
  void _setCheckingClub; void _setClubStatuses; // Suppress unused warnings
  const [holdBonus, setHoldBonus] = useState<HoldBonusData | null>(null);
  const [showHoldDetails, setShowHoldDetails] = useState(false);

  console.log('Profile build:', BUILD_VERSION);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const userData = tg.initDataUnsafe?.user;
      if (userData) {
        setUser(userData as TelegramUser);
        fetchProfile(userData.id);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
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
        // Fetch hold bonus data after profile
        fetchHoldBonus(telegramId);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHoldBonus = async (telegramId: number) => {
    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData || '';

      const response = await fetch(`${API_URL}/user/${telegramId}/hold-bonus`, {
        headers: { 'x-telegram-init-data': initData },
      });

      if (response.ok) {
        const data = await response.json();
        setHoldBonus(data.holdBonus);
      }
    } catch (error) {
      console.error('Failed to fetch hold bonus:', error);
    }
  };

  /* Temporarily disabled - will be enabled at end of season
  const checkClubMembership = async (clubId: string) => {
    if (!profile?.telegramId) return;

    setCheckingClub(clubId);

    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData || '';

      const response = await fetch(`${API_URL}/user/check-club/${clubId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isMember) {
          setClubStatuses(prev => ({ ...prev, [clubId]: true }));
          setToast(t.profile.clubActivated);
          // Refresh profile to get updated points
          if (user?.id) {
            fetchProfile(user.id);
          }
        } else {
          setToast(t.profile.notMember);
        }
      } else {
        setToast(t.profile.checkFailed);
      }
    } catch (error) {
      console.error('Club check error:', error);
      setToast(t.profile.connectionError);
    } finally {
      setCheckingClub(null);
    }
  };
  */

  const displayName = user?.username ? `@${user.username}` : user?.first_name || 'User';
  const nftCount = profile?.nftCount || profile?.counts?.nfts || 0;

  // Calculate user level based on totalPoints (same formula as backend)
  const userLevel = Math.min(Math.floor((profile?.totalPoints || 0) / 1000) + 1, 10);
  const pointsForNextLevel = userLevel < 10 ? userLevel * 1000 : null;
  const pointsProgress = pointsForNextLevel
    ? ((profile?.totalPoints || 0) - (userLevel - 1) * 1000) / 1000 * 100
    : 100;

  // Club boosts with proper rewards
  const clubs: ClubItem[] = [
    {
      id: 'ice-gang',
      title: 'Ice Gang',
      description: t.profile.iceGangDesc,
      reward: '+10/sticker',
      maxReward: `${t.profile.maxReward} 1000m`,
      icon: 'ice',
      gradient: 'from-cyan-400 to-blue-500',
      status: clubStatuses['ice-gang'] ? 'completed' : 'locked',
      chatLink: 'https://t.me/icegang_chat',
    },
    {
      id: 'notcap',
      title: 'Not Cap',
      description: t.profile.notCapDesc,
      reward: '+100/sticker',
      maxReward: `${t.profile.maxReward} 1000m`,
      icon: 'notkep',
      gradient: 'from-purple-400 to-pink-500',
      status: clubStatuses['notcap'] ? 'completed' : 'locked',
      chatLink: 'https://t.me/notcap_chat',
    },
    {
      id: 'sappy-seals',
      title: 'Sappy Seals',
      description: t.profile.sappySealsDesc,
      reward: '+70/sticker',
      maxReward: `${t.profile.maxReward} 500m`,
      icon: 'seal',
      gradient: 'from-blue-400 to-indigo-500',
      status: clubStatuses['sappy-seals'] ? 'completed' : 'locked',
      chatLink: 'https://t.me/sappyseals_chat',
    },
    // Diamond Hands removed - bonuses calculated at end of season
  ];

  // Achievements
  const tasks: TaskItem[] = [
    {
      id: 'first-sticker',
      title: t.profile.firstSticker,
      description: t.profile.firstStickerDesc,
      reward: '+50m',
      icon: 'sticker',
      gradient: 'from-green-400 to-emerald-500',
      status: nftCount > 0 ? 'completed' : 'available',
    },
    {
      id: 'top-100',
      title: t.profile.top100,
      description: t.profile.top100Desc,
      reward: t.profile.specialNft,
      icon: 'trophy',
      gradient: 'from-yellow-400 to-amber-500',
      status: (profile?.rank ?? 999) <= 100 ? 'completed' : 'locked',
    },
    {
      id: '30-day-streak',
      title: t.profile.streak30,
      description: t.profile.streak30Desc,
      reward: '+100m',
      icon: 'fire',
      gradient: 'from-orange-400 to-red-500',
      status: (profile?.currentStreak ?? 0) >= 30 ? 'completed' : 'available',
      progress: profile?.currentStreak ?? 0,
      target: 30,
    },
    {
      id: 'hold-bonus',
      title: t.profile.holdBonus,
      description: t.profile.holdBonusShortDesc,
      reward: '+10%/mo',
      icon: 'clock',
      gradient: 'from-indigo-400 to-purple-500',
      status: nftCount > 0 ? 'completed' : 'locked',
    },
  ];

  const getClubIcon = (icon: ClubItem['icon'], className: string) => {
    // Use image files for club icons
    switch (icon) {
      case 'ice':
        return <ClubImage src="/images/clubs/icegang.png" alt="Ice Gang" className={className} />;
      case 'notkep':
        return <ClubImage src="/images/clubs/notkep.png" alt="Notkep" className={className} />;
      case 'seal':
        return <ClubImage src="/images/clubs/sappyseals.png" alt="Sappy Seals" className={className} />;
    }
  };

  const getTaskIcon = (icon: TaskItem['icon'], className: string) => {
    switch (icon) {
      case 'users':
        return <UsersIcon className={className} />;
      case 'trophy':
        return <TrophyIcon className={className} />;
      case 'fire':
        return <FireIcon className={className} />;
      case 'sticker':
        return <StickerIcon className={className} />;
      case 'clock':
        return <ClockIcon className={className} />;
    }
  };

  const renderClubCard = (club: ClubItem) => {
    const isLocked = club.status === 'locked';
    const isCompleted = club.status === 'completed';
    // Will be used when club check is re-enabled
    void checkingClub;

    return (
      <div
        key={club.id}
        className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
          isCompleted
            ? 'bg-gradient-to-r from-emerald-900/40 to-emerald-800/30 border border-emerald-500/30'
            : 'bg-gradient-to-r from-[#0d1f33] to-[#0f2744] border border-cyan-800/30'
        }`}
      >
        {/* Glow effect */}
        {!isLocked && (
          <div className={`absolute inset-0 opacity-20 bg-gradient-to-r ${club.gradient} blur-xl`} />
        )}

        <div className="relative p-4 flex items-center gap-3">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
            isCompleted
              ? 'bg-emerald-500/30'
              : isLocked
              ? 'bg-gray-800/50'
              : `bg-gradient-to-br ${club.gradient} shadow-lg`
          }`}>
            {isCompleted ? (
              <CheckIcon className="w-5 h-5 text-emerald-400" />
            ) : (
              getClubIcon(club.icon, 'w-10 h-10')
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`font-bold text-sm ${
                isCompleted ? 'text-emerald-300' : isLocked ? 'text-gray-300' : 'text-white'
              }`}>
                {club.title}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-900/50 text-cyan-400 uppercase font-bold">
                {t.profile.club}
              </span>
            </div>
            <p className={`text-xs ${isCompleted ? 'text-emerald-500/70' : 'text-cyan-500/80'}`}>
              {club.description}
            </p>
            <p className="text-[10px] text-cyan-700 mt-0.5">{club.maxReward}</p>
          </div>

          {/* Action buttons - disabled until end of season */}
          <div className="flex-shrink-0 flex gap-2">
            {!club.isHold && !isCompleted && (
              <button
                disabled={true}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-gray-700/50 text-gray-500 cursor-not-allowed"
              >
                {t.tasks.check}
              </button>
            )}
            {club.isHold && (
              <div className="text-right">
                <div className="font-bold text-sm text-cyan-300">{club.reward}</div>
              </div>
            )}
            {isCompleted && (
              <div className="text-emerald-400 font-bold text-sm">{club.reward}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTaskCard = (task: TaskItem) => {
    const isLocked = task.status === 'locked';
    const isCompleted = task.status === 'completed';

    return (
      <div
        key={task.id}
        className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
          isCompleted
            ? 'bg-gradient-to-r from-emerald-900/40 to-emerald-800/30 border border-emerald-500/30'
            : isLocked
            ? 'bg-[#0c1c2e]/60 border border-gray-700/30 opacity-60'
            : 'bg-gradient-to-r from-[#0d1f33] to-[#0f2744] border border-cyan-800/30'
        }`}
      >
        {!isLocked && !isCompleted && (
          <div className={`absolute inset-0 opacity-20 bg-gradient-to-r ${task.gradient} blur-xl`} />
        )}

        <div className="relative p-4 flex items-center gap-3">
          {/* Icon */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isCompleted
              ? 'bg-emerald-500/30'
              : isLocked
              ? 'bg-gray-800/50'
              : `bg-gradient-to-br ${task.gradient}`
          }`}>
            {isCompleted ? (
              <CheckIcon className="w-5 h-5 text-emerald-400" />
            ) : isLocked ? (
              <LockIcon className="w-5 h-5 text-gray-500" />
            ) : (
              getTaskIcon(task.icon, 'w-5 h-5 text-white')
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <span className={`font-bold text-sm ${
              isCompleted ? 'text-emerald-300' : isLocked ? 'text-gray-400' : 'text-white'
            }`}>
              {task.title}
            </span>
            <p className={`text-xs ${
              isCompleted ? 'text-emerald-500/70' : isLocked ? 'text-gray-600' : 'text-cyan-500/80'
            }`}>
              {task.description}
            </p>

            {/* Progress bar */}
            {task.progress !== undefined && task.target && !isCompleted && !isLocked && (
              <div className="mt-2">
                <div className="h-1.5 bg-[#0a1520] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${task.gradient}`}
                    style={{ width: `${Math.min(100, (task.progress / task.target) * 100)}%` }}
                  />
                </div>
                <div className="text-[10px] mt-1 text-cyan-600 font-medium">
                  {task.progress}/{task.target}
                </div>
              </div>
            )}
          </div>

          {/* Reward */}
          <div className={`font-bold text-sm flex-shrink-0 ${
            isCompleted ? 'text-emerald-400' : isLocked ? 'text-gray-500' : 'text-cyan-300'
          }`}>
            {task.reward}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d2137] to-[#0a1929]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-5 py-2.5 rounded-xl shadow-lg toast-enter font-medium">
            {toast}
          </div>
        )}

        {/* Profile Header */}
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c1c2e] via-[#0f2744] to-[#0c1c2e]" />
          <div className="absolute inset-0 border border-cyan-500/20 rounded-3xl" />
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-[80px]" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500/10 rounded-full blur-[80px]" />

          <div className="relative z-10 p-6 text-center">
            <div className="w-24 h-24 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full blur-lg opacity-50" />
              <div className="relative w-full h-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-full border-2 border-cyan-400/50 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.4)]">
                {user?.photo_url ? (
                  <img src={user.photo_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Snowman size={56} />
                )}
              </div>
            </div>

            <h2 className="text-2xl font-black mb-1 text-white">{displayName}</h2>

            {userAddress && (
              <div className="inline-flex items-center gap-2 bg-cyan-950/50 rounded-full px-4 py-1.5 mt-2 border border-cyan-800/30">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-sm text-cyan-400 font-mono">
                  {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Level Card */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1f33] to-[#0c1929]" />
          <div className="absolute inset-0 border border-yellow-500/20 rounded-2xl" />
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-[40px]" />

          <div className="relative p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                  <span className="text-xl font-black text-white">{loading ? '...' : userLevel}</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{t.level} {loading ? '...' : userLevel}</div>
                  <div className="text-xs text-yellow-500/70">
                    {loading ? '...' : userLevel >= 10 ? t.profile.maxLevel : `${pointsForNextLevel! - (profile?.totalPoints || 0)} ${t.profile.metersToNext}`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-yellow-400">{loading ? '...' : profile?.totalPoints || 0}</div>
                <div className="text-[10px] text-cyan-600">{t.meters}</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-[#0a1520] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all"
                style={{ width: `${loading ? 0 : Math.min(pointsProgress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-cyan-700">
              <span>{t.level} {userLevel}</span>
              <span>{userLevel < 10 ? `${t.level} ${userLevel + 1}` : t.max}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1f33] to-[#0c1929] border border-cyan-800/20 p-3 text-center">
            <div className="text-xl font-black text-cyan-400">
              {loading ? '...' : profile?.rank ? `#${profile.rank}` : '#—'}
            </div>
            <div className="text-[10px] text-cyan-600 mt-0.5">{t.home.rank}</div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1f33] to-[#0c1929] border border-cyan-800/20 p-3 text-center">
            <div className="text-xl font-black text-emerald-400">
              {loading ? '...' : profile?.totalPoints || 0}
            </div>
            <div className="text-[10px] text-cyan-600 mt-0.5">{t.meters}</div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1f33] to-[#0c1929] border border-cyan-800/20 p-3 text-center">
            <div className="text-xl font-black text-purple-400">
              {loading ? '...' : nftCount}
            </div>
            <div className="text-[10px] text-cyan-600 mt-0.5">{t.home.nfts}</div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1f33] to-[#0c1929] border border-cyan-800/20 p-3 text-center">
            <div className="text-xl font-black text-orange-400">
              {loading ? '...' : profile?.currentStreak || 0}
            </div>
            <div className="text-[10px] text-cyan-600 mt-0.5">{t.home.streak}</div>
          </div>
        </div>

        {/* Club Boosts */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <IceGangIcon className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">{t.profile.clubBoosts}</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {t.profile.availableEndSeason}
            </span>
          </div>
          <div className="space-y-2">
            {clubs.map(club => renderClubCard(club))}
          </div>
        </div>

        {/* Achievements */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <TrophyIcon className="w-5 h-5 text-yellow-400" />
            <h2 className="text-sm font-bold text-white">{t.profile.achievements}</h2>
          </div>
          <div className="space-y-2">
            {tasks.map(task => renderTaskCard(task))}
          </div>
        </div>

        {/* Hold Bonus Section */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/30 to-purple-900/30" />
          <div className="absolute inset-0 border border-indigo-500/20 rounded-2xl" />

          <div className="relative p-4">
            {/* Header with toggle */}
            <button
              onClick={() => setShowHoldDetails(!showHoldDetails)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-indigo-300 text-sm block">{t.profile.holdBonusTitle}</span>
                  <span className="text-xs text-indigo-500">
                    {holdBonus ? `+${holdBonus.totalHoldBonus}m ${t.profile.earned}` : t.profile.holdBonusShortDesc}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {holdBonus && holdBonus.totalHoldBonus > 0 && (
                  <span className="text-lg font-black text-indigo-400">+{holdBonus.totalHoldBonus}m</span>
                )}
                <ChevronDownIcon className={`w-5 h-5 text-indigo-400 transition-transform ${showHoldDetails ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Expanded details */}
            {showHoldDetails && (
              <div className="mt-4 space-y-3 border-t border-indigo-500/20 pt-4">
                {/* How it works */}
                <p className="text-xs text-indigo-400/80 leading-relaxed mb-3">
                  {t.profile.holdBonusDesc}
                </p>

                {/* Hold bonus info - calculated at end of season */}
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ClockIcon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-300">{t.profile.holdBonusEndOfSeason || 'Hold Bonus'}</span>
                  </div>
                  <p className="text-[11px] text-indigo-400">
                    {t.profile.holdBonusEndOfSeasonDesc || 'Hold bonuses (+10% per month) will be calculated and awarded at the end of the season'}
                  </p>
                </div>

                {/* NFT list - show all whitelisted NFTs */}
                {holdBonus && holdBonus.nfts.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-indigo-400 font-semibold">{t.profile.yourNfts} ({holdBonus.nfts.length})</p>
                    {holdBonus.nfts.map((nft) => (
                      <div
                        key={nft.nftId}
                        className="bg-indigo-950/50 border border-indigo-800/30 rounded-xl p-2.5 flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs text-indigo-200 truncate">{nft.name}</p>
                          <p className="text-[10px] text-indigo-500">{nft.collection}</p>
                        </div>
                        {nft.holdDays > 0 && (
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-xs text-indigo-400">{nft.holdDays} {t.profile.days}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <StickerIcon className="w-8 h-8 mx-auto text-indigo-600 mb-2" />
                    <p className="text-xs text-indigo-500">{t.profile.noNftsForHold}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Level System Info */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-900/20 to-amber-900/20" />
          <div className="absolute inset-0 border border-yellow-500/20 rounded-2xl" />

          <div className="relative p-4">
            <div className="flex items-center gap-3 mb-2">
              <TrophyIcon className="w-5 h-5 text-yellow-400" />
              <span className="font-bold text-yellow-300 text-sm">{t.profile.levelSystem}</span>
            </div>
            <p className="text-xs text-yellow-400/80 leading-relaxed">
              {t.profile.levelSystemDesc}
            </p>
          </div>
        </div>

        <div className="h-24" />
      </div>
    </div>
  );
}
