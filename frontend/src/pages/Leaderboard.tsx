import { useState, useEffect } from 'react';

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

// Ice Crown for 1st place
const IceCrown = () => (
  <div className="relative">
    <svg className="w-10 h-10 drop-shadow-[0_0_15px_rgba(147,197,253,0.8)]" viewBox="0 0 48 48" fill="none">
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
    <div className="absolute inset-0 animate-pulse">
      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
    </div>
  </div>
);

// Countdown timer hook
const useWeekCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
      nextMonday.setHours(0, 0, 0, 0);

      const diff = nextMonday.getTime() - now.getTime();

      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / (1000 * 60)) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  return timeLeft;
};

// Countdown popup component
const CountdownPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { days, hours, minutes, seconds } = useWeekCountdown();

  if (!isOpen) return null;

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center backdrop-blur-sm">
          <span className="text-xl font-black text-cyan-300">
            {value.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="absolute -inset-0.5 rounded-xl bg-cyan-400/20 blur-sm -z-10" />
      </div>
      <span className="text-[10px] text-cyan-600 mt-1.5 uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-sm">
        <div className="relative overflow-hidden rounded-2xl">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c1c2e] via-[#0f2744] to-[#0c1c2e]" />
          <div className="absolute inset-0 border border-cyan-500/30 rounded-2xl" />

          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-cyan-500/20 rounded-full blur-3xl" />

          <div className="relative p-5">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-cyan-900/50 border border-cyan-700/50 flex items-center justify-center text-cyan-500 hover:text-cyan-300 transition-colors"
            >
              ✕
            </button>

            <div className="text-center mb-4">
              <span className="text-sm text-cyan-500 uppercase tracking-widest">Season ends in</span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <TimeBlock value={days} label="Days" />
              <span className="text-cyan-500/50 text-xl font-bold mt-[-20px]">:</span>
              <TimeBlock value={hours} label="Hours" />
              <span className="text-cyan-500/50 text-xl font-bold mt-[-20px]">:</span>
              <TimeBlock value={minutes} label="Min" />
              <span className="text-cyan-500/50 text-xl font-bold mt-[-20px]">:</span>
              <TimeBlock value={seconds} label="Sec" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('meters');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchLeaderboard();
    setCurrentPage(1);
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const initData = window.Telegram?.WebApp?.initData || '';

      const apiMetric = activeTab === 'ice' ? 'stickers' : activeTab;
      const response = await fetch(`${API_URL}/leaderboard/mountain?metric=${apiMetric}&limit=100`, {
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

  const getDisplayName = (user: MountainUser) => {
    if (user.username) return `@${user.username}`;
    if (user.first_name) return user.first_name;
    return 'User';
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a1929] to-[#0d2137]">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin" />
            <IceCrystal className="absolute inset-0 m-auto w-10 h-10 text-cyan-400 animate-pulse" />
          </div>
          <p className="text-cyan-300/60 mt-6 text-sm tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-[#0a1929] to-[#0d2137]">
        <div className="text-center p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
          <IceCrystal className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error || 'Failed to load data'}</p>
          <button
            onClick={fetchLeaderboard}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { metric, podium, list, me } = data;

  // Pagination
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
              Meters
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

        {/* ===== ICE MOUNTAIN TOP 5 ===== */}
        {podium.length > 0 && (
          <div className="relative overflow-hidden rounded-3xl">
            {/* Background layers */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c1c2e] via-[#0f2744] to-[#0c1c2e]" />

            {/* Aurora effect */}
            <div className="absolute inset-0 overflow-hidden opacity-60">
              <div className="absolute -top-20 left-0 w-full h-40 bg-gradient-to-r from-cyan-500/20 via-blue-400/30 to-cyan-500/20 blur-3xl animate-pulse" />
              <div className="absolute top-20 -left-20 w-60 h-60 bg-cyan-400/20 rounded-full blur-[80px]" />
              <div className="absolute top-10 -right-20 w-60 h-60 bg-blue-500/15 rounded-full blur-[80px]" />
            </div>

            {/* Frost border */}
            <div className="absolute inset-0 rounded-3xl border border-cyan-400/20" />

            {/* Content */}
            <div className="relative z-10 p-4 pt-6">
              {/* Title with timer icon */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-cyan-950/50 border border-cyan-500/30 backdrop-blur-sm">
                  <IceCrystal className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-sm tracking-widest text-cyan-300 uppercase">
                    Summit Top 5
                  </span>
                  <button
                    onClick={() => setShowCountdown(true)}
                    className="w-6 h-6 rounded-full bg-cyan-800/50 border border-cyan-600/50 flex items-center justify-center hover:bg-cyan-700/50 transition-colors"
                  >
                    <TimerIcon className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                </div>
              </div>

              {/* Mountain SVG with users */}
              <div className="relative h-[280px]">
                {/* Mountain Shape */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 280" preserveAspectRatio="xMidYMax meet">
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

                  {/* Mountain body */}
                  <path
                    d="M200 30 L320 180 L350 175 L380 220 L400 280 L0 280 L20 220 L50 175 L80 180 L200 30Z"
                    fill="url(#mountainGradient)"
                    filter="url(#mountainGlow)"
                  />

                  {/* Mountain shine overlay */}
                  <path
                    d="M200 30 L80 180 L50 175 L20 220 L0 280 L150 280 L200 30Z"
                    fill="url(#mountainShine)"
                  />

                  {/* Snow caps */}
                  <path
                    d="M200 30 L170 70 L185 65 L200 80 L215 65 L230 70 L200 30Z"
                    fill="white"
                    fillOpacity="0.9"
                  />
                  <path
                    d="M160 90 L175 85 L168 100 L160 90Z"
                    fill="white"
                    fillOpacity="0.6"
                  />
                  <path
                    d="M240 90 L225 85 L232 100 L240 90Z"
                    fill="white"
                    fillOpacity="0.6"
                  />

                  {/* Ice texture lines */}
                  <path d="M200 60 L140 150" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
                  <path d="M200 60 L260 150" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
                  <path d="M170 100 L100 200" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
                  <path d="M230 100 L300 200" stroke="white" strokeOpacity="0.15" strokeWidth="1" />

                  {/* Sparkles */}
                  <circle cx="200" cy="45" r="2" fill="white" opacity="0.9">
                    <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="175" cy="75" r="1.5" fill="white" opacity="0.7">
                    <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="225" cy="75" r="1.5" fill="white" opacity="0.7">
                    <animate attributeName="opacity" values="0.7;0.2;0.7" dur="3s" repeatCount="indefinite" />
                  </circle>
                </svg>

                {/* Users positioned on mountain */}
                {/* 1st place - top */}
                {podium[0] && (
                  <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '5px' }}>
                    <div className="flex flex-col items-center">
                      <IceCrown />
                      <div className="relative -mt-1">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 animate-pulse opacity-60 blur-sm" />
                        <div className="relative w-14 h-14 rounded-full overflow-hidden ring-[3px] ring-cyan-400">
                          {podium[0].avatar_url ? (
                            <img src={podium[0].avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-700 to-cyan-900 flex items-center justify-center text-cyan-200 text-xl font-bold">
                              {podium[0].first_name?.[0] || podium[0].username?.[0] || '?'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] font-semibold text-cyan-100 mt-1 max-w-[70px] truncate text-center">
                        {getDisplayName(podium[0])}
                      </div>
                      <div className="text-[10px] font-black text-cyan-300">{podium[0].value.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {/* 2nd place - left */}
                {podium[1] && (
                  <div className="absolute" style={{ left: '22%', top: '85px' }}>
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center text-slate-700 font-black text-sm shadow-lg mb-1">
                        2
                      </div>
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-slate-300 to-slate-400 opacity-40 blur-sm" />
                        <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-slate-300">
                          {podium[1].avatar_url ? (
                            <img src={podium[1].avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-700 to-cyan-900 flex items-center justify-center text-cyan-200 text-lg font-bold">
                              {podium[1].first_name?.[0] || podium[1].username?.[0] || '?'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold text-cyan-200/80 mt-1 max-w-[60px] truncate text-center">
                        {getDisplayName(podium[1])}
                      </div>
                      <div className="text-[10px] font-black text-slate-300">{podium[1].value.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {/* 3rd place - right */}
                {podium[2] && (
                  <div className="absolute" style={{ right: '22%', top: '85px' }}>
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-white font-black text-sm shadow-lg mb-1">
                        3
                      </div>
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 opacity-40 blur-sm" />
                        <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-cyan-500">
                          {podium[2].avatar_url ? (
                            <img src={podium[2].avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-700 to-cyan-900 flex items-center justify-center text-cyan-200 text-lg font-bold">
                              {podium[2].first_name?.[0] || podium[2].username?.[0] || '?'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold text-cyan-200/80 mt-1 max-w-[60px] truncate text-center">
                        {getDisplayName(podium[2])}
                      </div>
                      <div className="text-[10px] font-black text-cyan-400">{podium[2].value.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {/* 4th place - lower left */}
                {podium[3] && (
                  <div className="absolute" style={{ left: '8%', top: '165px' }}>
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-lg bg-cyan-900/60 border border-cyan-600/40 flex items-center justify-center text-cyan-400 font-bold text-xs mb-1">
                        4
                      </div>
                      <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-cyan-700">
                        {podium[3].avatar_url ? (
                          <img src={podium[3].avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-cyan-700 to-cyan-900 flex items-center justify-center text-cyan-200 font-bold">
                            {podium[3].first_name?.[0] || podium[3].username?.[0] || '?'}
                          </div>
                        )}
                      </div>
                      <div className="text-[9px] font-semibold text-cyan-300/70 mt-1 max-w-[55px] truncate text-center">
                        {getDisplayName(podium[3])}
                      </div>
                      <div className="text-[9px] font-bold text-cyan-500">{podium[3].value.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {/* 5th place - lower right */}
                {podium[4] && (
                  <div className="absolute" style={{ right: '8%', top: '165px' }}>
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-lg bg-cyan-900/60 border border-cyan-600/40 flex items-center justify-center text-cyan-400 font-bold text-xs mb-1">
                        5
                      </div>
                      <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-cyan-700">
                        {podium[4].avatar_url ? (
                          <img src={podium[4].avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-cyan-700 to-cyan-900 flex items-center justify-center text-cyan-200 font-bold">
                            {podium[4].first_name?.[0] || podium[4].username?.[0] || '?'}
                          </div>
                        )}
                      </div>
                      <div className="text-[9px] font-semibold text-cyan-300/70 mt-1 max-w-[55px] truncate text-center">
                        {getDisplayName(podium[4])}
                      </div>
                      <div className="text-[9px] font-bold text-cyan-500">{podium[4].value.toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== MY POSITION ===== */}
        {me && (
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
                  <div className="font-bold text-cyan-200 text-sm">Your Position</div>
                  <div className="text-xs text-cyan-600">
                    {me.rank <= 10 ? 'Elite Top 10' : me.rank <= 100 ? 'Top 100' : `Top ${Math.ceil(me.rank / data.pagination.total * 100)}%`}
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

        {/* ===== RANKINGS LIST ===== */}
        {list.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <IceCrystal className="w-4 h-4 text-cyan-500" />
                <h2 className="text-sm font-bold text-cyan-400 tracking-wide">Rankings</h2>
              </div>
              <span className="text-xs text-cyan-700">
                {list.length} participants
              </span>
            </div>

            <div className="space-y-2">
              {paginatedList.map((user) => (
                <div
                  key={user.user_id}
                  className={`group relative flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${
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

                    <div className={`w-10 h-10 flex-shrink-0 rounded-full overflow-hidden ${
                      user.is_me ? 'ring-2 ring-cyan-500/50' : 'ring-1 ring-cyan-800/50'
                    }`}>
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
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right min-w-[60px] flex-shrink-0">
                    <div className={`font-bold ${user.is_me ? 'text-cyan-300' : 'text-cyan-400'}`}>
                      {user.value.toLocaleString()}
                    </div>
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
        {podium.length === 0 && list.length === 0 && (
          <div className="text-center py-20">
            <IceCrystal className="w-20 h-20 text-cyan-600 mx-auto mb-6 animate-pulse" />
            <p className="text-cyan-400 text-lg font-semibold">No rankings yet</p>
            <p className="text-cyan-700 text-sm mt-2">Be the first to climb the summit!</p>
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-6" />
      </div>

      {/* Countdown Popup */}
      <CountdownPopup isOpen={showCountdown} onClose={() => setShowCountdown(false)} />
    </div>
  );
}
