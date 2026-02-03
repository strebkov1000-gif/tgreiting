// @ts-nocheck
import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://icetop.app/api';

interface Task {
  id: string;
  key: string;
  title: string;
  description: string;
  reward: number;
  type: string;
  targetUrl: string;
  icon: string;
  completed: boolean;
}

interface ReferralInfo {
  code: string;
  totalInvited: number;
  confirmedInvited: number;
  rewardPerFriend: number;
  friendBonus: number;
}

interface Referral {
  id: string;
  name: string;
  level: number;
  points: number;
  joinedAt: string;
  confirmed: boolean;
}

// Icons
const TelegramIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
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

const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronRightIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ShareIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CopyIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ClockIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v6l4 2" strokeLinecap="round"/>
  </svg>
);

const SpinnerIcon = ({ className = '' }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

export default function Tasks() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [showReferrals, setShowReferrals] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const getInitData = () => {
    return window.Telegram?.WebApp?.initData || '';
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        headers: { 'x-telegram-init-data': getInitData() }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
        setReferralInfo(data.referral || null);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferrals = async () => {
    try {
      const response = await fetch(`${API_URL}/tasks/referrals`, {
        headers: { 'x-telegram-init-data': getInitData() }
      });

      if (response.ok) {
        const data = await response.json();
        setReferrals(data.referrals || []);
      }
    } catch (error) {
      console.error('Failed to fetch referrals:', error);
    }
  };

  const handleTaskClick = (task: Task) => {
    if (task.completed) return;

    // Open the target URL
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink && task.targetUrl.includes('t.me')) {
      tg.openTelegramLink(task.targetUrl);
    } else if (tg?.openLink) {
      tg.openLink(task.targetUrl);
    } else {
      window.open(task.targetUrl, '_blank');
    }
  };

  const handleVerifyTask = async (task: Task) => {
    if (task.completed || verifying) return;

    setVerifying(task.id);

    try {
      const response = await fetch(`${API_URL}/tasks/${task.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': getInitData()
        }
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        setTasks(prev => prev.map(t =>
          t.id === task.id ? { ...t, completed: true } : t
        ));
        setToast({ message: `+${task.reward} ${t.meters}!`, type: 'success' });
      } else if (data.alreadyCompleted) {
        setTasks(prev => prev.map(t =>
          t.id === task.id ? { ...t, completed: true } : t
        ));
      } else {
        setToast({ message: data.message || t.toasts.completeTaskFirst, type: 'error' });
      }
    } catch (error) {
      setToast({ message: t.toasts.verificationFailed, type: 'error' });
    } finally {
      setVerifying(null);
    }
  };

  const getReferralLink = () => {
    if (!referralInfo?.code) return '';
    const botUsername = import.meta.env.VITE_BOT_USERNAME || 'IceTopbot';
    return `https://t.me/${botUsername}?start=${referralInfo.code}`;
  };

  const handleCopyLink = async () => {
    const link = getReferralLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setToast({ message: t.toasts.linkCopied, type: 'success' });
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setToast({ message: t.toasts.linkCopied, type: 'success' });
    }
  };

  const handleShare = () => {
    const link = getReferralLink();
    if (!link) return;

    const tg = window.Telegram?.WebApp;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(t.toasts.shareText + ' 🏔️')}`;

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const handleShowReferrals = () => {
    if (!showReferrals) {
      fetchReferrals();
    }
    setShowReferrals(!showReferrals);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length + 1; // +1 for invite friends

  // Get translated task title/description by key
  const getTaskTitle = (task: Task) => {
    const key = task.key as keyof typeof t.taskTitles;
    return t.taskTitles[key] || task.title;
  };

  const getTaskDescription = (task: Task) => {
    const key = task.key as keyof typeof t.taskDescriptions;
    return t.taskDescriptions[key] || task.description;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d2137] to-[#0a1929] flex items-center justify-center">
        <SpinnerIcon className="w-8 h-8 text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d2137] to-[#0a1929]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl shadow-lg font-medium toast-enter ${
            toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="text-center py-2">
          <h1 className="text-2xl font-black text-white mb-1">{t.tasks.title}</h1>
          <p className="text-cyan-500/70 text-sm">{completedCount}/{totalTasks} {t.tasks.completed}</p>
        </div>

        {/* Invite Friends Card - Premium Style */}
        <div className="relative overflow-hidden rounded-2xl">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/20 to-cyan-600/20" />
          <div className="absolute inset-0 border border-violet-500/30 rounded-2xl" />
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/20 rounded-full blur-[60px]" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-[60px]" />

          <div className="relative p-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-lg">{t.tasks.inviteFriends}</h3>
                <p className="text-xs text-violet-300/70">{t.tasks.earnTogether}</p>
              </div>
            </div>

            {/* Rewards Info */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white/5 backdrop-blur rounded-xl p-3 text-center border border-white/10">
                <div className="text-xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  +5
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{t.tasks.metersForYou}</div>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-xl p-3 text-center border border-white/10">
                <div className="text-xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  +5
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{t.tasks.metersForFriend}</div>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-xl p-3 text-center border border-white/10">
                <div className="text-xl font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  +1
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{t.tasks.metersForL2 || 'L2 refs'}</div>
              </div>
            </div>

            {/* Bonuses Info */}
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <CheckIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-xs text-emerald-200/80">{t.tasks.rewardUnlocks}</span>
                <span className="text-xs text-emerald-400/60 block mt-0.5">{t.tasks.level3Equals}</span>
              </div>
            </div>

            {/* 100 Referrals Bonus */}
            <div className="flex items-start gap-2 mb-4 px-3 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex-1">
                <span className="text-xs text-amber-200/90 font-medium">{t.tasks.bonus100refs || 'За 100 рефералов — 1000м + Task Event'}</span>
                <a
                  href="https://t.me/baron_creator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-400 block mt-0.5 hover:underline"
                >
                  {t.tasks.contactBaron || 'Написать @baron_creator'}
                </a>
              </div>
            </div>

            {/* Share Button - Gradient */}
            <button
              onClick={handleShare}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 text-white font-bold text-sm shadow-lg hover:shadow-violet-500/30 transition-all flex items-center justify-center gap-2 mb-3"
            >
              <ShareIcon className="w-5 h-5" />
              {t.tasks.shareLink}
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <CopyIcon className="w-4 h-4" />
              {t.tasks.copyLink}
            </button>

            {/* My Friends Section */}
            <button
              onClick={handleShowReferrals}
              className="w-full mt-4 pt-4 border-t border-white/10 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{t.tasks.myFriends}</span>
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold">
                  {referralInfo?.totalInvited || 0}
                </span>
              </div>
              <ChevronRightIcon className={`w-5 h-5 text-gray-500 transition-transform ${showReferrals ? 'rotate-90' : ''}`} />
            </button>

            {/* Referrals List */}
            {showReferrals && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {referrals.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    {t.tasks.noFriends}
                  </div>
                ) : (
                  referrals.map((referral) => {
                    const isLevel2 = referral.level >= 2;
                    return (
                      <div
                        key={referral.id}
                        className={`p-3 rounded-xl border ${
                          isLevel2
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-white/5 border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border ${
                            isLevel2
                              ? 'bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border-emerald-500/30'
                              : 'bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border-violet-500/30'
                          }`}>
                            {referral.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-sm truncate">{referral.name}</div>
                            <div className="text-xs text-gray-500">
                              {t.level} {referral.level} • {referral.points}m
                            </div>
                          </div>
                          <div className="text-right">
                            {isLevel2 ? (
                              <>
                                <div className="text-sm font-bold text-emerald-400">+5</div>
                                <div className="text-xs text-emerald-500/70">{t.tasks.confirmed}</div>
                              </>
                            ) : (
                              <>
                                <div className="text-sm font-bold text-amber-400">⏳</div>
                                <div className="text-xs text-amber-500/70">{t.tasks.pending}</div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
                task.completed
                  ? 'bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 border border-emerald-500/20'
                  : 'bg-gradient-to-r from-[#0d1f33] to-[#0f2744] border border-cyan-800/20'
              }`}
            >
              {/* Glow effect for active tasks */}
              {!task.completed && (
                <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-cyan-500 to-blue-500 blur-xl" />
              )}

              <div className="relative p-4">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    task.completed
                      ? 'bg-emerald-500/20'
                      : 'bg-gradient-to-br from-cyan-500 to-blue-500'
                  }`}>
                    {task.completed ? (
                      <CheckIcon className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <TelegramIcon className="w-6 h-6 text-white" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm mb-0.5">{getTaskTitle(task)}</div>
                    <div className="text-xs text-cyan-500/70">{getTaskDescription(task)}</div>
                  </div>

                  {/* Reward / Done badge */}
                  {task.completed ? (
                    <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold border border-emerald-500/30">
                      {t.tasks.done}
                    </div>
                  ) : (
                    <div className="font-bold text-lg text-cyan-300">
                      +{task.reward}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!task.completed && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button
                      onClick={() => handleTaskClick(task)}
                      className="py-2.5 rounded-xl bg-cyan-900/50 text-cyan-300 font-semibold text-sm hover:bg-cyan-800/50 transition-all"
                    >
                      {t.tasks.start}
                    </button>
                    <button
                      onClick={() => handleVerifyTask(task)}
                      disabled={verifying === task.id}
                      className="py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {verifying === task.id ? (
                        <SpinnerIcon className="w-4 h-4" />
                      ) : (
                        t.tasks.check
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <TelegramIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t.tasks.noTasks}</p>
          </div>
        )}

        {/* Bottom padding for navigation */}
        <div className="h-24" />
      </div>
    </div>
  );
}
