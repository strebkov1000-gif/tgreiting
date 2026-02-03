import { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://icetop.app/api';

interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  totalPointsEarned: number;
  referrals: {
    username: string | null;
    firstName: string | null;
    points: number;
    joinedAt: string;
  }[];
}

// Sticker icon
const StickerIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.796 9.982a1 1 0 00-.336-.769l-6-5.25a1 1 0 00-1.32 0l-6 5.25A1 1 0 008 10v9a2 2 0 002 2h8a2 2 0 002-2v-1.354c1.061-.42 2-1.267 2-2.646v-5.018zM18 19h-8v-8.348l4-3.5 4 3.5V15c0 .355-.189.833-.553 1.179A1.989 1.989 0 0118 17v2z"/>
    <circle cx="12" cy="14" r="2"/>
  </svg>
);

// Gift icon
const GiftIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Copy icon
const CopyIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Share icon
const ShareIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Check icon
const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Star icon
const StarIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

// Trophy icon
const TrophyIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 1012 0V2z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Users icon
const UsersIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Referrals() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralStats();
  }, []);

  const fetchReferralStats = async () => {
    try {
      const tg = window.Telegram?.WebApp;
      const telegramId = tg?.initDataUnsafe?.user?.id;

      if (!telegramId) {
        setLoading(false);
        return;
      }

      const initData = tg?.initData || '';
      const response = await fetch(`${API_URL}/referral/stats/${telegramId}`, {
        headers: {
          'x-telegram-init-data': initData,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!stats?.referralLink) return;

    try {
      await navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = stats.referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (!stats?.referralLink) return;

    const tg = window.Telegram?.WebApp;
    const shareText = t.referrals.subtitle;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(stats.referralLink)}&text=${encodeURIComponent(shareText)}`;

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const referralCount = stats?.totalReferrals || 0;
  const hasBonus50 = referralCount >= 50;
  const hasBonus100 = referralCount >= 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d2137] to-[#0a1929]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Main Invite Card */}
        <div className="relative overflow-hidden rounded-3xl">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c1c2e] via-[#0f2744] to-[#0c1c2e]" />
          <div className="absolute inset-0 border border-cyan-500/20 rounded-3xl" />

          {/* Glow effects */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/20 rounded-full blur-[80px]" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500/15 rounded-full blur-[80px]" />

          <div className="relative z-10 p-6">
            {/* Header with sticker icon */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.4)]">
                <StickerIcon className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-center text-white mb-2">
              {t.referrals.title}
            </h1>
            <p className="text-cyan-400/70 text-center text-sm mb-6">
              {t.referrals.subtitle}
            </p>

            {/* Stats row */}
            <div className="flex justify-center gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-black text-cyan-300">
                  {loading ? '...' : referralCount}
                </div>
                <div className="text-xs text-cyan-600 uppercase tracking-wider">{t.referrals.referrals}</div>
              </div>
              <div className="w-px bg-cyan-800/50" />
              <div className="text-center">
                <div className="text-3xl font-black text-green-400">
                  {loading ? '...' : stats?.totalPointsEarned || 0}
                </div>
                <div className="text-xs text-cyan-600 uppercase tracking-wider">{t.referrals.metersEarned}</div>
              </div>
            </div>

            {/* Referral Link */}
            <div className="bg-[#0a1520] rounded-2xl p-4 mb-4 border border-cyan-900/50">
              <div className="text-xs text-cyan-600 mb-2 uppercase tracking-wider">{t.referrals.yourLink}</div>
              <div className="font-mono text-sm text-cyan-300 break-all mb-3 bg-cyan-950/30 rounded-lg p-3">
                {stats?.referralLink || 't.me/IceTopbot?start=...'}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopyLink}
                  disabled={!stats?.referralLink}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-950/50 border border-cyan-700/50 text-cyan-400 font-semibold text-sm hover:bg-cyan-900/50 transition-all disabled:opacity-50"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">{t.tasks.copied}</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-4 h-4" />
                      <span>{t.referrals.copy}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleShare}
                  disabled={!stats?.referralLink}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm hover:from-cyan-400 hover:to-blue-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-50"
                >
                  <ShareIcon className="w-4 h-4" />
                  <span>{t.referrals.share}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bonuses Card */}
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c1c2e] to-[#0f2744]" />
          <div className="absolute inset-0 border border-cyan-900/30 rounded-3xl" />

          <div className="relative z-10 p-5">
            <div className="flex items-center gap-2 mb-4">
              <GiftIcon className="w-5 h-5 text-cyan-400" />
              <h2 className="font-bold text-cyan-300 tracking-wide">{t.referrals.bonuses}</h2>
            </div>

            <div className="space-y-3">
              {/* Bonus 1: 5 meters per referral */}
              <div className="flex items-center justify-between bg-cyan-950/30 rounded-xl p-4 border border-cyan-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{t.referrals.perReferral}</div>
                    <div className="text-xs text-cyan-600">{t.referrals.forEachFriend}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-lg text-cyan-300">+5</div>
                  <div className="text-xs text-cyan-600">{t.meters}</div>
                </div>
              </div>

              {/* Bonus 2: 500 meters for 50+ refs */}
              <div className={`flex items-center justify-between rounded-xl p-4 border transition-all ${
                hasBonus50
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-cyan-950/30 border-cyan-800/30'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    hasBonus50 ? 'bg-green-500/20' : 'bg-yellow-500/20'
                  }`}>
                    <StarIcon className={`w-5 h-5 ${hasBonus50 ? 'text-green-400' : 'text-yellow-400'}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                      {t.referrals.extraBonus}
                      {hasBonus50 && <CheckIcon className="w-4 h-4 text-green-400" />}
                    </div>
                    <div className="text-xs text-cyan-600">{t.referrals.reach100}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-black text-lg ${hasBonus50 ? 'text-green-400' : 'text-yellow-400'}`}>+500</div>
                  <div className="text-xs text-cyan-600">{t.meters}</div>
                </div>
              </div>

              {/* Bonus 3: 1000 meters + task event for 100+ refs */}
              <div className={`flex items-center justify-between rounded-xl p-4 border transition-all ${
                hasBonus100
                  ? 'bg-purple-500/10 border-purple-500/30'
                  : 'bg-cyan-950/30 border-cyan-800/30'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    hasBonus100 ? 'bg-purple-500/20' : 'bg-purple-500/10'
                  }`}>
                    <TrophyIcon className={`w-5 h-5 ${hasBonus100 ? 'text-purple-400' : 'text-purple-500/70'}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                      {t.referrals.castTaskUnlock}
                      {hasBonus100 && <CheckIcon className="w-4 h-4 text-purple-400" />}
                    </div>
                    <div className="text-xs text-cyan-600">{t.referrals.reach150}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-black text-lg ${hasBonus100 ? 'text-purple-400' : 'text-purple-500/70'}`}>+1000</div>
                  <div className="text-xs text-cyan-600">{t.meters}</div>
                </div>
              </div>

              {/* Task Event unlock message */}
              {hasBonus100 && (
                <div className="flex items-center justify-center gap-2 p-3 bg-purple-500/20 border border-purple-500/30 rounded-xl">
                  <TrophyIcon className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-semibold text-purple-300">{t.referrals.taskEvent}</span>
                </div>
              )}

              {/* Progress indicator */}
              {!hasBonus100 && (
                <div className="mt-2 px-1">
                  <div className="flex justify-between text-xs text-cyan-600 mb-1">
                    <span>{referralCount} {t.referrals.referrals}</span>
                    <span>{hasBonus50 ? '100' : '50'} {t.referrals.needed}</span>
                  </div>
                  <div className="h-2 bg-cyan-950/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        hasBonus50
                          ? 'bg-gradient-to-r from-purple-500 to-purple-400'
                          : 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                      }`}
                      style={{
                        width: `${Math.min(100, (referralCount / (hasBonus50 ? 100 : 50)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Referral List */}
        {stats?.referrals && stats.referrals.length > 0 && (
          <div className="relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0c1c2e] to-[#0f2744]" />
            <div className="absolute inset-0 border border-cyan-900/30 rounded-3xl" />

            <div className="relative z-10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <UsersIcon className="w-5 h-5 text-cyan-400" />
                <h2 className="font-bold text-cyan-300 tracking-wide">{t.referrals.yourReferrals}</h2>
                <span className="ml-auto text-xs text-cyan-600 bg-cyan-950/50 px-2 py-1 rounded-full">
                  {stats.referrals.length}
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {stats.referrals.map((ref, index) => (
                  <div key={index} className="flex items-center justify-between bg-cyan-950/30 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                        {(ref.firstName?.[0] || ref.username?.[0] || '?').toUpperCase()}
                      </div>
                      <span className="text-sm text-cyan-200">
                        {ref.username ? `@${ref.username}` : ref.firstName || 'User'}
                      </span>
                    </div>
                    <span className="text-xs text-cyan-600">
                      {new Date(ref.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-6" />
      </div>
    </div>
  );
}
