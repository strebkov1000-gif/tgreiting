import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useNetworkError } from '../contexts/NetworkErrorContext';
import { useWalletScanStore } from '../store/walletScanStore';

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
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

type LeaderboardTab = 'meters' | 'ice';

// Ice crystal SVG
const IceCrystal = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L9 5H6L5 9L2 12L5 15L6 19H9L12 22L15 19H18L19 15L22 12L19 9L18 5H15L12 2ZM12 6L14 8H16L17 10L19 12L17 14L16 16H14L12 18L10 16H8L7 14L5 12L7 10L8 8H10L12 6Z"/>
  </svg>
);

// Timer icon
const TimerIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2" />
    <path d="M9 2h6" />
    <path d="M12 2v2" />
  </svg>
);

// Question mark icon - beautiful gradient version
const QuestionIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="questionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" stroke="url(#questionGradient)" strokeWidth="2" fill="none" />
    <text x="12" y="16" textAnchor="middle" fill="url(#questionGradient)" fontSize="12" fontWeight="bold" fontFamily="Arial">?</text>
  </svg>
);

// Ice Crown for 1st place
const IceCrown = () => (
  <div className="relative">
    <svg className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_0_15px_rgba(147,197,253,0.8)]" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="crownGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="50%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path
        d="M8 36L4 12L14 20L24 8L34 20L44 12L40 36H8Z"
        fill="url(#crownGradient)"
        filter="url(#glow)"
        stroke="#BAE6FD"
        strokeWidth="1"
      />
      <circle cx="14" cy="18" r="2" fill="#F0F9FF"/>
      <circle cx="24" cy="10" r="2.5" fill="#F0F9FF"/>
      <circle cx="34" cy="18" r="2" fill="#F0F9FF"/>
      <path d="M10 38H38V42C38 43.1 37.1 44 36 44H12C10.9 44 10 43.1 10 42V38Z" fill="url(#crownGradient)" stroke="#BAE6FD" strokeWidth="1"/>
    </svg>
    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full opacity-80" />
  </div>
);

// Countdown timer hook - counts to February 14, 2026 (Season 1 end)
const useWeekCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Season ends February 14, 2026 at 23:59:59 UTC
      const seasonEnd = new Date('2026-02-14T23:59:59Z');
      const now = new Date();
      const diff = seasonEnd.getTime() - now.getTime();

      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / (1000 * 60)) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, []);

  return timeLeft;
};

// Supply tiers data
const SUPPLY_TIERS = [
  { supply: '0-99', meters: 250 },
  { supply: '100-199', meters: 200 },
  { supply: '200-299', meters: 170 },
  { supply: '300-399', meters: 160 },
  { supply: '400-499', meters: 150 },
  { supply: '500-599', meters: 140 },
  { supply: '600-699', meters: 130 },
  { supply: '700-799', meters: 120 },
  { supply: '800-899', meters: 110 },
  { supply: '900-999', meters: 100 },
  { supply: '1000-1999', meters: 90 },
  { supply: '2000-2999', meters: 80 },
  { supply: '3000-3999', meters: 70 },
  { supply: '4000-4999', meters: 60 },
  { supply: '5000-5999', meters: 50 },
  { supply: '6000-6999', meters: 40 },
  { supply: '7000-7999', meters: 30 },
  { supply: '8000-8999', meters: 20 },
  { supply: '9000-9999', meters: 5 },
  { supply: '10000+', meters: 2 },
];

// Meters info popup component
const MetersInfoPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[85%] max-w-[320px] max-h-[60vh] flex flex-col rounded-2xl overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1c2e] via-[#0f2744] to-[#0c1c2e]" />
        <div className="absolute inset-0 border border-cyan-500/30 rounded-2xl pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-cyan-500/20 rounded-full blur-3xl" />

        {/* Fixed Header */}
        <div className="relative flex-shrink-0 p-4 pb-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-cyan-900/80 border border-cyan-700/50 flex items-center justify-center text-cyan-500 hover:text-cyan-300 transition-colors z-20"
          >
            ✕
          </button>

          <div className="text-center mb-4 pr-8">
            <span className="text-lg font-bold text-cyan-300">{t.leaderboard?.metersInfo || 'Meters Info'}</span>
          </div>

          {/* Info message */}
          <div className="bg-cyan-950/50 rounded-xl p-3 border border-cyan-800/30 mb-4">
            <p className="text-xs text-cyan-400 leading-relaxed">
              {t.leaderboard?.metersDescription || 'Учитываются ончейн стикеры из коллекций Sticker Pack и Goodies. Чем меньше supply коллекции — тем больше метров даёт стикер.'}
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="relative flex-1 overflow-y-auto px-4 pb-4 min-h-0">
          {/* Table */}
          <div className="rounded-xl border border-cyan-800/30 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-cyan-950/95 backdrop-blur-sm z-10">
                <tr>
                  <th className="text-left p-3 text-cyan-500 font-semibold">Supply</th>
                  <th className="text-right p-3 text-cyan-500 font-semibold">{t.leaderboard?.metersPerSticker || 'Meters'}</th>
                </tr>
              </thead>
              <tbody>
                {SUPPLY_TIERS.map((row, i) => (
                  <tr key={i} className="border-t border-cyan-900/30 hover:bg-cyan-900/20 transition-colors">
                    <td className="p-3 text-cyan-300 font-mono">{row.supply}</td>
                    <td className="p-3 text-right font-bold text-white">{row.meters}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Collections info */}
          <div className="mt-4 flex gap-2">
            <div className="flex-1 bg-cyan-950/50 rounded-xl p-2 border border-cyan-800/30 text-center">
              <span className="text-[10px] text-cyan-600 block">Sticker Pack</span>
              <span className="text-xs font-bold text-cyan-300">SP</span>
            </div>
            <div className="flex-1 bg-cyan-950/50 rounded-xl p-2 border border-cyan-800/30 text-center">
              <span className="text-[10px] text-cyan-600 block">Goodies</span>
              <span className="text-xs font-bold text-cyan-300">GDI</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Trophy Icon
const AnimatedTrophyIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="trophyGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>
    <path d="M12 15c-3.87 0-7-3.13-7-7V4h14v4c0 3.87-3.13 7-7 7z" fill="url(#trophyGold)" stroke="#FDE68A" strokeWidth="0.5" />
    <path d="M5 4V3a1 1 0 011-1h12a1 1 0 011 1v1" stroke="#FDE68A" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5 6H3a1 1 0 00-1 1v1a3 3 0 003 3" stroke="url(#trophyGold)" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M19 6h2a1 1 0 011 1v1a3 3 0 01-3 3" stroke="url(#trophyGold)" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 15v3M9 21h6M12 18c-1 0-2 .5-2 1.5V21h4v-1.5c0-1-1-1.5-2-1.5z" stroke="url(#trophyGold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="9" r="2" fill="#FEF3C7" />
  </svg>
);

// Diamond Icon
const AnimatedDiamondIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="diamondPurple" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#C4B5FD" />
        <stop offset="50%" stopColor="#A78BFA" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
    <path d="M12 2L2 9l10 13 10-13L12 2z" fill="url(#diamondPurple)" stroke="#C4B5FD" strokeWidth="0.5" />
    <path d="M2 9h20M7 2l-1 7M17 2l1 7M12 9v13" stroke="#E9D5FF" strokeWidth="0.5" strokeOpacity="0.6"/>
    <path d="M12 5L8 9h8l-4-4z" fill="#EDE9FE" fillOpacity="0.5" />
  </svg>
);

// Snowflake Icon
const AnimatedSnowflakeIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="snowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E0F2FE" />
        <stop offset="50%" stopColor="#7DD3FC" />
        <stop offset="100%" stopColor="#38BDF8" />
      </linearGradient>
    </defs>
    <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" stroke="url(#snowGradient)" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="3" fill="url(#snowGradient)" />
    <circle cx="12" cy="5" r="1.5" fill="#BAE6FD"/>
    <circle cx="12" cy="19" r="1.5" fill="#BAE6FD"/>
    <circle cx="5" cy="12" r="1.5" fill="#BAE6FD"/>
    <circle cx="19" cy="12" r="1.5" fill="#BAE6FD"/>
  </svg>
);

// Countdown popup component
const CountdownPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { days } = useWeekCountdown();
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-sm">
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c1c2e] via-[#0f2744] to-[#0c1c2e]" />
          <div className="absolute inset-0 border border-cyan-500/30 rounded-2xl" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-cyan-500/20 rounded-full blur-3xl" />

          {/* Animated snowflakes background */}
          <div className="absolute top-2 left-4 opacity-20">
            <AnimatedSnowflakeIcon className="w-6 h-6" />
          </div>
          <div className="absolute bottom-10 right-4 opacity-20">
            <AnimatedSnowflakeIcon className="w-5 h-5" />
          </div>

          <div className="relative p-5">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-cyan-900/50 border border-cyan-700/50 flex items-center justify-center text-cyan-500 hover:text-cyan-300 transition-colors"
            >
              ✕
            </button>

            {/* Season badge */}
            <div className="flex justify-center mb-3">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-300">
                {t.leaderboard.seasonOne}
              </span>
            </div>

            <div className="text-center mb-4">
              <span className="text-sm text-cyan-500 uppercase tracking-widest">{t.leaderboard.seasonEnds}</span>
            </div>

            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="w-28 h-28 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 flex flex-col items-center justify-center backdrop-blur-sm">
                  <span className="text-5xl font-black text-cyan-300">{days}</span>
                  <span className="text-xs text-cyan-600 uppercase tracking-wider">{t.leaderboard.days}</span>
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-cyan-400/20 blur-md -z-10" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-cyan-950/50 rounded-xl p-3 border border-cyan-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <AnimatedTrophyIcon className="w-5 h-5" />
                  <span className="text-xs font-bold text-cyan-300">{t.leaderboard.clubRaffle}</span>
                </div>
                <p className="text-[11px] text-cyan-600">{t.leaderboard.clubRaffleDesc}</p>
              </div>

              <div className="bg-cyan-950/50 rounded-xl p-3 border border-cyan-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <AnimatedDiamondIcon className="w-5 h-5" />
                  <span className="text-xs font-bold text-cyan-300">{t.leaderboard.holdBonus}</span>
                </div>
                <p className="text-[11px] text-cyan-600">{t.leaderboard.holdBonusEndSeason || 'Hold bonuses will be calculated at end of season'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default function Leaderboard() {
  const { t } = useLanguage();
  const { triggerNetworkError } = useNetworkError();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('meters');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showMetersInfo, setShowMetersInfo] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Watch for wallet scan completion to refresh leaderboard
  const { progress: scanProgress } = useWalletScanStore();
  const prevScanStepRef = useRef(scanProgress.currentStep);

  useEffect(() => {
    // Refresh leaderboard when wallet scan completes
    if (prevScanStepRef.current !== 'complete' && scanProgress.currentStep === 'complete') {
      // Small delay to ensure backend has updated
      setTimeout(() => {
        fetchLeaderboard();
      }, 500);
    }
    prevScanStepRef.current = scanProgress.currentStep;
  }, [scanProgress.currentStep]);

  useEffect(() => {
    if (activeTab === 'ice') {
      setLoading(false);
      return;
    }
    fetchLeaderboard();
    setCurrentPage(1);
    setRetryCount(0);
  }, [activeTab]);

  const fetchLeaderboard = async (retry = 0) => {
    try {
      if (retry === 0) {
        setLoading(true);
        setIsRetrying(false);
      } else {
        setIsRetrying(true);
      }
      setError(null);

      const initData = window.Telegram?.WebApp?.initData || '';

      const apiMetric = activeTab === 'ice' ? 'stickers' : activeTab;
      const response = await fetch(`${API_URL}/leaderboard/mountain?metric=${apiMetric}&limit=100`, {
        headers: {
          'x-telegram-init-data': initData,
          'Authorization': initData ? `tma ${initData}` : '',
        },
      });

      // Check for auth errors
      if (response.status === 401 || response.status === 403) {
        triggerNetworkError();
        return;
      }

      if (response.status === 429) {
        if (retry < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retry);
          setRetryCount(retry + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchLeaderboard(retry + 1);
        }
        throw new Error('Too many requests. Please wait a moment.');
      }

      if (!response.ok) {
        if (response.status >= 500 && retry < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retry);
          setRetryCount(retry + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchLeaderboard(retry + 1);
        }
        throw new Error('Failed to fetch leaderboard');
      }

      const result = await response.json();
      setData(result);
      setRetryCount(0);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch') && retry < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retry);
        setRetryCount(retry + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchLeaderboard(retry + 1);
      }

      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  const getDisplayName = (user: MountainUser) => {
    if (user.username) return `@${user.username}`;
    if (user.first_name) return user.first_name;
    return 'User';
  };

  if (loading || isRetrying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a1929] to-[#0d2137]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <IceCrystal className="w-12 h-12 text-cyan-400" />
            <div className="absolute inset-0 w-12 h-12 border-2 border-cyan-500/30 rounded-full animate-ping" />
          </div>
          <p className="text-cyan-400/60 text-sm">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-[#0a1929] to-[#0d2137]">
        <div className="text-center p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
          <IceCrystal className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error || t.error}</p>
          <button
            onClick={() => fetchLeaderboard()}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold text-white"
          >
            {t.tryAgain}
          </button>
        </div>
      </div>
    );
  }

  const { metric, podium, list, me } = data;
  const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE);
  const paginatedList = list.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d2137] to-[#0a1929]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Metric Switcher */}
        <div className="flex justify-center">
          <div className="relative inline-flex bg-[#0c1c2e] rounded-2xl p-1.5 border border-cyan-900/50">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <button
              onClick={() => setActiveTab('meters')}
              className={`relative z-10 px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                activeTab === 'meters'
                  ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-[0_0_30px_rgba(34,211,238,0.4)]'
                  : 'text-cyan-500/60 hover:text-cyan-400'
              }`}
            >
              {t.meters}
            </button>
            <button
              onClick={() => setActiveTab('ice')}
              className={`relative z-10 px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                activeTab === 'ice'
                  ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-[0_0_30px_rgba(34,211,238,0.4)]'
                  : 'text-cyan-500/60 hover:text-cyan-400'
              }`}
            >
              Ice
            </button>
          </div>
        </div>

        {/* Ice tab - Cooking state */}
        {activeTab === 'ice' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="text-8xl mb-6">
                <span role="img" aria-label="cooking">🍳</span>
              </div>
              <div className="absolute -inset-4 bg-cyan-500/20 rounded-full blur-3xl" />
            </div>
            <h2 className="text-2xl font-black text-cyan-300 mb-2">{t.leaderboard.cooking}</h2>
            <p className="text-cyan-600 text-sm">{t.leaderboard.comingSoon}</p>
          </div>
        )}

        {/* Mountain Top 5 */}
        {activeTab === 'meters' && podium.length > 0 && (
          <div className="relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c1c2e] via-[#0f2744] to-[#0c1c2e]" />
            <div className="absolute inset-0 overflow-hidden opacity-60">
              <div className="absolute -top-20 left-0 w-full h-40 bg-gradient-to-r from-cyan-500/20 via-blue-400/30 to-cyan-500/20 blur-3xl" />
              <div className="absolute top-20 -left-20 w-60 h-60 bg-cyan-400/20 rounded-full blur-[80px]" />
              <div className="absolute top-10 -right-20 w-60 h-60 bg-blue-500/15 rounded-full blur-[80px]" />
            </div>
            <div className="absolute inset-0 rounded-3xl border border-cyan-400/20" />

            <div className="relative z-10 p-4 pt-2">
              {/* Header with title and icons */}
              <div className="flex items-center justify-center gap-3 mb-2">
                <button
                  onClick={() => setShowMetersInfo(true)}
                  className="w-10 h-10 rounded-full bg-cyan-900/60 border border-cyan-500/40 flex items-center justify-center hover:bg-cyan-800/60 hover:border-cyan-400/50 transition-all hover:scale-105 shadow-lg shadow-cyan-500/20"
                >
                  <QuestionIcon className="w-6 h-6" />
                </button>
                <h2 className="text-sm font-bold text-cyan-300 tracking-widest uppercase">
                  {t.leaderboard?.summitTop || 'Summit Top 5'}
                </h2>
                <button
                  onClick={() => setShowCountdown(true)}
                  className="w-10 h-10 rounded-full bg-cyan-900/60 border border-cyan-500/40 flex items-center justify-center hover:bg-cyan-800/60 hover:border-cyan-400/50 transition-all hover:scale-105 shadow-lg shadow-cyan-500/20"
                >
                  <TimerIcon className="w-6 h-6 text-cyan-400" />
                </button>
              </div>

              <div className="relative h-[340px]">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 340" preserveAspectRatio="xMidYMax meet">
                  <defs>
                    <linearGradient id="mountainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.9" />
                      <stop offset="30%" stopColor="#22D3EE" stopOpacity="0.7" />
                      <stop offset="60%" stopColor="#0891B2" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#164E63" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="mountainShine" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.15" />
                      <stop offset="30%" stopColor="white" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                    <filter id="mountainGlow">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <path d="M200 20 L320 210 L350 205 L380 260 L400 340 L0 340 L20 260 L50 205 L80 210 L200 20Z" fill="url(#mountainGradient)" filter="url(#mountainGlow)" />
                  <path d="M200 20 L80 210 L50 205 L20 260 L0 340 L150 340 L200 20Z" fill="url(#mountainShine)" />
                  <path d="M200 20 L165 70 L182 62 L200 80 L218 62 L235 70 L200 20Z" fill="white" fillOpacity="0.9" />
                  <path d="M155 95 L172 88 L163 108 L155 95Z" fill="white" fillOpacity="0.6" />
                  <path d="M245 95 L228 88 L237 108 L245 95Z" fill="white" fillOpacity="0.6" />
                  <path d="M200 55 L130 180" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
                  <path d="M200 55 L270 180" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
                  <path d="M165 110 L90 240" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
                  <path d="M235 110 L310 240" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
                  <circle cx="200" cy="35" r="2" fill="white" opacity="0.9" />
                  <circle cx="172" cy="70" r="1.5" fill="white" opacity="0.7" />
                  <circle cx="228" cy="70" r="1.5" fill="white" opacity="0.7" />
                </svg>

                {/* 1st place */}
                {podium[0] && (
                  <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '8px' }}>
                    <div className="flex flex-col items-center">
                      <IceCrown />
                      <div className="relative -mt-1">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 opacity-60 blur-sm" />
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-[3px] ring-cyan-400">
                          {podium[0].avatar_url ? (
                            <img src={podium[0].avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-700 to-cyan-900 flex items-center justify-center text-cyan-200 text-xl font-bold">
                              {podium[0].first_name?.[0] || podium[0].username?.[0] || '?'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-cyan-100 mt-1.5 max-w-[100px] sm:max-w-[120px] truncate text-center drop-shadow-lg">{getDisplayName(podium[0])}</div>
                      <div className="text-[11px] sm:text-xs font-black text-cyan-300">{podium[0].value.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {/* 2nd place */}
                {podium[1] && (
                  <div className="absolute" style={{ left: '18%', top: '115px' }}>
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center text-slate-700 font-black text-sm shadow-lg mb-1">2</div>
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-slate-300 to-slate-400 opacity-40 blur-sm" />
                        <div className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-full overflow-hidden ring-2 ring-slate-300">
                          {podium[1].avatar_url ? (
                            <img src={podium[1].avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-700 to-cyan-900 flex items-center justify-center text-cyan-200 text-lg font-bold">
                              {podium[1].first_name?.[0] || podium[1].username?.[0] || '?'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] sm:text-xs font-semibold text-cyan-200 mt-1 max-w-[80px] sm:max-w-[90px] truncate text-center">{getDisplayName(podium[1])}</div>
                      <div className="text-[10px] sm:text-[11px] font-black text-slate-300">{podium[1].value.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {/* 3rd place */}
                {podium[2] && (
                  <div className="absolute" style={{ right: '18%', top: '115px' }}>
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-white font-black text-sm shadow-lg mb-1">3</div>
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 opacity-40 blur-sm" />
                        <div className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-full overflow-hidden ring-2 ring-cyan-500">
                          {podium[2].avatar_url ? (
                            <img src={podium[2].avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-700 to-cyan-900 flex items-center justify-center text-cyan-200 text-lg font-bold">
                              {podium[2].first_name?.[0] || podium[2].username?.[0] || '?'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] sm:text-xs font-semibold text-cyan-200 mt-1 max-w-[80px] sm:max-w-[90px] truncate text-center">{getDisplayName(podium[2])}</div>
                      <div className="text-[10px] sm:text-[11px] font-black text-cyan-400">{podium[2].value.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {/* 4th place */}
                {podium[3] && (
                  <div className="absolute" style={{ left: '8%', top: '210px' }}>
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-lg bg-cyan-900/60 border border-cyan-600/40 flex items-center justify-center text-cyan-400 font-bold text-xs mb-1">4</div>
                      <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-cyan-700">
                        {podium[3].avatar_url ? (
                          <img src={podium[3].avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-cyan-700 to-cyan-900 flex items-center justify-center text-cyan-200 font-bold">
                            {podium[3].first_name?.[0] || podium[3].username?.[0] || '?'}
                          </div>
                        )}
                      </div>
                      <div className="text-[9px] font-semibold text-cyan-300/70 mt-1 max-w-[55px] truncate text-center">{getDisplayName(podium[3])}</div>
                      <div className="text-[9px] font-bold text-cyan-500">{podium[3].value.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {/* 5th place */}
                {podium[4] && (
                  <div className="absolute" style={{ right: '8%', top: '210px' }}>
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-lg bg-cyan-900/60 border border-cyan-600/40 flex items-center justify-center text-cyan-400 font-bold text-xs mb-1">5</div>
                      <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-cyan-700">
                        {podium[4].avatar_url ? (
                          <img src={podium[4].avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-cyan-700 to-cyan-900 flex items-center justify-center text-cyan-200 font-bold">
                            {podium[4].first_name?.[0] || podium[4].username?.[0] || '?'}
                          </div>
                        )}
                      </div>
                      <div className="text-[9px] font-semibold text-cyan-300/70 mt-1 max-w-[55px] truncate text-center">{getDisplayName(podium[4])}</div>
                      <div className="text-[9px] font-bold text-cyan-500">{podium[4].value.toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* My Position */}
        {activeTab === 'meters' && me && (
          <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/30 via-cyan-800/20 to-cyan-900/30" />
            <div className="absolute inset-0 border border-cyan-500/20 rounded-2xl" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />

            <div className="relative p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-black bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                  #{me.rank}
                </div>
                <div>
                  <div className="font-bold text-cyan-200 text-sm">{t.leaderboard.yourPosition}</div>
                  <div className="text-xs text-cyan-600">
                    {me.rank <= 10 ? t.leaderboard.eliteTop10 : me.rank <= 100 ? t.leaderboard.top100 : `Top ${Math.ceil(me.rank / data.pagination.total * 100)}%`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-cyan-300">{me.value.toLocaleString()}</div>
                <div className="text-[10px] text-cyan-700 uppercase tracking-wider">{metric.display_name}</div>
              </div>
            </div>
          </div>
        )}

        {/* Rankings List */}
        {activeTab === 'meters' && list.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <IceCrystal className="w-4 h-4 text-cyan-500" />
                <h2 className="text-sm font-bold text-cyan-400 tracking-wide">{t.leaderboard.rankings}</h2>
              </div>
              <span className="text-xs text-cyan-700">{data.pagination.total} {t.leaderboard.participants}</span>
            </div>

            <div className="space-y-2">
              {paginatedList.map((user) => (
                <div
                  key={user.user_id}
                  className={`group relative flex items-center justify-between p-3 rounded-xl transition-colors duration-200 ${
                    user.is_me
                      ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                      : 'bg-[#0c1c2e]/60 border border-cyan-900/30 hover:border-cyan-700/40'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-sm ${
                      user.is_me
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-cyan-950/50 text-cyan-600 border border-cyan-800/30'
                    }`}>
                      {user.rank}
                    </div>

                    <div className={`w-10 h-10 flex-shrink-0 rounded-full overflow-hidden ${user.is_me ? 'ring-2 ring-cyan-500/50' : 'ring-1 ring-cyan-800/50'}`}>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-cyan-800 to-cyan-900 flex items-center justify-center text-cyan-400">
                          {user.first_name?.[0] || user.username?.[0] || '?'}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className={`font-semibold text-sm truncate ${user.is_me ? 'text-cyan-200' : 'text-cyan-300/90'}`}>
                        {getDisplayName(user)}
                        {user.is_me && (
                          <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase">
                            {t.you}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right min-w-[60px] flex-shrink-0">
                    <div className={`font-bold ${user.is_me ? 'text-cyan-300' : 'text-cyan-400'}`}>{user.value.toLocaleString()}</div>
                    <div className="text-[9px] text-cyan-700 uppercase tracking-wider">{metric.display_name}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-800/50 flex items-center justify-center text-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-900/50 hover:text-cyan-400 transition-all"
                >
                  ←
                </button>

                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all ${
                          currentPage === page
                            ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                            : 'bg-cyan-950/50 border border-cyan-800/50 text-cyan-600 hover:text-cyan-400 hover:border-cyan-700/50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-800/50 flex items-center justify-center text-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-900/50 hover:text-cyan-400 transition-all"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {activeTab === 'meters' && podium.length === 0 && list.length === 0 && (
          <div className="text-center py-20">
            <IceCrystal className="w-20 h-20 text-cyan-600 mx-auto mb-6" />
            <p className="text-cyan-400 text-lg font-semibold">{t.leaderboard.noRankings}</p>
            <p className="text-cyan-700 text-sm mt-2">{t.leaderboard.beFirst}</p>
          </div>
        )}

        <div className="h-6" />
      </div>

      <CountdownPopup isOpen={showCountdown} onClose={() => setShowCountdown(false)} />
      <MetersInfoPopup isOpen={showMetersInfo} onClose={() => setShowMetersInfo(false)} />
    </div>
  );
}
