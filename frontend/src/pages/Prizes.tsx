import { useState, useEffect } from 'react';
import Prize from '../components/icons/Prize';
import { DiamondIcon, TargetIcon, StickerIcon, MedalIcon } from '../components/icons/IceIcons';
import { useLanguage } from '../i18n/LanguageContext';
import { useNetworkError } from '../contexts/NetworkErrorContext';

const GiftIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TelegramIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
  </svg>
);

const API_URL = import.meta.env.VITE_API_URL || 'https://icetop.app/api';

interface Condition {
  id: string;
  taskId?: string;
  title: string;
  description: string;
  completed: boolean;
  checking?: boolean;
  action?: string;
  actionUrl?: string;
}

const SpinnerIcon = ({ className = '' }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

export default function Prizes() {
  const { t } = useLanguage();
  const { triggerNetworkError } = useNetworkError();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);

  const getInitData = () => {
    return window.Telegram?.WebApp?.initData || '';
  };

  useEffect(() => {
    const loadConditions = async () => {
      let icTaskCompleted = false;
      let nftTaskCompleted = false;
      let icTaskId: string | undefined;
      let nftTaskId: string | undefined;

      try {
        const response = await fetch(`${API_URL}/tasks`, {
          headers: { 'x-telegram-init-data': getInitData() }
        });

        // Check for auth errors
        if (response.status === 401 || response.status === 403) {
          triggerNetworkError();
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const tasks = data.tasks || [];

          const icTask = tasks.find((task: any) => task.key === 'subscribe_ice_creators');
          const nftTask = tasks.find((task: any) => task.key === 'subscribe_nftcol');

          icTaskCompleted = icTask?.completed || false;
          nftTaskCompleted = nftTask?.completed || false;
          icTaskId = icTask?.id;
          nftTaskId = nftTask?.id;
        }
      } catch (error) {
        console.error('Failed to load conditions:', error);
      }

      // ВСЕГДА устанавливаем условия, даже если API не ответил
      setConditions([
        {
          id: 'ranked',
          title: t.prizes.getRanked,
          description: t.prizes.getRankedDesc,
          completed: true,
        },
        {
          id: 'subscribe-ic',
          taskId: icTaskId,
          title: t.prizes.subscribeIc,
          description: t.prizes.subscribeIcDesc,
          completed: icTaskCompleted,
          action: t.prizes.subscribe,
          actionUrl: 'https://t.me/ice_creators',
        },
        {
          id: 'subscribe-nft',
          taskId: nftTaskId,
          title: t.prizes.subscribeNft,
          description: t.prizes.subscribeNftDesc,
          completed: nftTaskCompleted,
          action: t.prizes.subscribe,
          actionUrl: 'https://t.me/nftcol',
        },
      ]);

      setLoading(false);
    };

    loadConditions();
  }, [t]);

  const allCompleted = conditions.length > 0 && conditions.every(c => c.completed);

  const handleSubscribe = (condition: Condition) => {
    if (condition.actionUrl) {
      const tg = window.Telegram?.WebApp;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(condition.actionUrl);
      } else {
        window.open(condition.actionUrl, '_blank');
      }
    }
  };

  const handleVerify = async (condition: Condition) => {
    if (!condition.taskId || condition.completed || condition.checking) return;

    setConditions(prev =>
      prev.map(c => c.id === condition.id ? { ...c, checking: true } : c)
    );

    try {
      const response = await fetch(`${API_URL}/tasks/${condition.taskId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': getInitData()
        }
      });

      // Check for auth errors
      if (response.status === 401 || response.status === 403) {
        triggerNetworkError();
        return;
      }

      const data = await response.json();

      if (data.verified || data.alreadyCompleted) {
        setConditions(prev =>
          prev.map(c => c.id === condition.id ? { ...c, completed: true, checking: false } : c)
        );
      } else {
        setConditions(prev =>
          prev.map(c => c.id === condition.id ? { ...c, checking: false } : c)
        );
      }
    } catch (error) {
      console.error('Verify error:', error);
      setConditions(prev =>
        prev.map(c => c.id === condition.id ? { ...c, checking: false } : c)
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d2137] to-[#0a1929] flex items-center justify-center">
        <SpinnerIcon className="w-8 h-8 text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d2137] to-[#0a1929]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Main Raffle Card */}
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/30 via-orange-900/20 to-red-900/30" />
          <div className="absolute inset-0 border border-yellow-500/30 rounded-3xl" />
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-yellow-500/20 rounded-full blur-[80px]" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-orange-500/15 rounded-full blur-[80px]" />

          <div className="relative z-10 p-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.5)]">
                <GiftIcon className="w-9 h-9 text-white" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-center text-white mb-1">
              {t.prizes.title}
            </h1>
            <p className="text-yellow-400/80 text-center text-lg font-bold mb-2">
              {t.prizes.prizePool}
            </p>
            <p className="text-orange-300/60 text-center text-sm mb-3">
              {t.prizes.forHoldersOnly}
            </p>

            {/* Results date banner */}
            <div className="flex items-center justify-center mb-6">
              <span className="text-sm font-bold text-yellow-300 tracking-wide">
                {t.prizes.resultsDate}
              </span>
            </div>

            <div className="space-y-2 mb-5">
              <p className="text-xs text-orange-400/70 uppercase tracking-wider text-center mb-3">
                {t.prizes.completeToParticipate}
              </p>

              {conditions.map((condition) => (
                <div
                  key={condition.id}
                  className={`p-3 rounded-xl border transition-all ${
                    condition.completed
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-black/20 border-yellow-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      condition.completed
                        ? 'bg-green-500/20 border border-green-500/50'
                        : 'bg-yellow-900/30 border border-yellow-700/30'
                    }`}>
                      {condition.completed ? (
                        <CheckIcon className="w-4 h-4 text-green-400" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-yellow-600/50" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm ${
                        condition.completed ? 'text-green-300' : 'text-yellow-200'
                      }`}>
                        {condition.title}
                      </div>
                      <div className={`text-xs ${
                        condition.completed ? 'text-green-600' : 'text-yellow-600/70'
                      }`}>
                        {condition.description}
                      </div>
                    </div>

                    {condition.completed && (
                      <span className="text-xs text-green-500 font-semibold flex-shrink-0">{t.prizes.done}</span>
                    )}
                  </div>

                  {condition.action && !condition.completed && (
                    <div className="flex gap-2 mt-3 ml-11">
                      <button
                        onClick={() => handleSubscribe(condition)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-semibold hover:bg-yellow-500/30 transition-all"
                      >
                        <TelegramIcon className="w-3.5 h-3.5" />
                        {condition.action}
                      </button>
                      <button
                        onClick={() => handleVerify(condition)}
                        disabled={condition.checking}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-semibold hover:bg-green-500/30 transition-all disabled:opacity-50 min-w-[70px]"
                      >
                        {condition.checking ? (
                          <>
                            <SpinnerIcon className="w-3 h-3" />
                            <span className="opacity-70">{t.tasks.check}</span>
                          </>
                        ) : (
                          t.tasks.check
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              disabled={!allCompleted}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                allCompleted
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:from-green-400 hover:to-emerald-400'
                  : 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/30'
              }`}
            >
              {allCompleted ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckIcon className="w-5 h-5" />
                  {t.prizes.participating}
                </span>
              ) : (
                t.prizes.completeAll
              )}
            </button>
          </div>
        </div>

        {/* Other Prizes */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c1c2e]/80 to-[#0f2744]/60" />
          <div className="absolute inset-0 border border-cyan-500/20 rounded-2xl" />

          <div className="relative z-10 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Prize size={24} className="text-cyan-400" />
              <h2 className="font-bold text-cyan-300">{t.prizes.morePrizes}</h2>
            </div>

            <div className="space-y-3">
              {/* NFTs-PFPs */}
              <div className="flex items-center gap-4 p-4 bg-cyan-950/30 rounded-xl border border-cyan-800/30 hover:border-cyan-500/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                  <DiamondIcon size={28} className="text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-cyan-200">{t.prizes.nftsPfps}</div>
                  <div className="text-sm text-cyan-600">{t.prizes.nftsPfpsDesc}</div>
                </div>
              </div>

              {/* Stickers */}
              <div className="flex items-center gap-4 p-4 bg-cyan-950/30 rounded-xl border border-cyan-800/30 hover:border-cyan-500/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl flex items-center justify-center border border-yellow-500/30">
                  <StickerIcon size={28} className="text-yellow-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-cyan-200">{t.prizes.stickers}</div>
                  <div className="text-sm text-cyan-600">{t.prizes.stickersDesc}</div>
                </div>
              </div>

              {/* WLs */}
              <div className="flex items-center gap-4 p-4 bg-cyan-950/30 rounded-xl border border-cyan-800/30 hover:border-cyan-500/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                  <TargetIcon size={28} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-cyan-200">{t.prizes.whitelists}</div>
                  <div className="text-sm text-cyan-600">{t.prizes.whitelistsDesc}</div>
                </div>
              </div>

              {/* Achievements */}
              <div className="flex items-center gap-4 p-4 bg-cyan-950/30 rounded-xl border border-cyan-800/30 hover:border-cyan-500/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                  <MedalIcon size={28} className="text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-cyan-200">{t.prizes.achievementsTitle}</div>
                  <div className="text-sm text-cyan-600">{t.prizes.achievementsDesc}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-20" />
      </div>
    </div>
  );
}
