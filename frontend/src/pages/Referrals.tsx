import { useState, useEffect } from 'react';
import {
  UsersIcon, ClipboardIcon, ShareIcon, GiftIcon, WaveIcon, LinkIcon, StickerIcon
} from '../components/icons/IceIcons';

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

export default function Referrals() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchReferralStats();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
      setToast('Link copied!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = stats.referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setToast('Link copied!');
    }
  };

  const handleShare = () => {
    if (!stats?.referralLink) return;

    const tg = window.Telegram?.WebApp;
    // Include link in text for better visibility
    const shareText = `Join IceTop and climb the mountain with me! 🧊⛰️\n\n${stats.referralLink}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(stats.referralLink)}&text=${encodeURIComponent('Join IceTop and climb the mountain with me! 🧊⛰️')}`;

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else if (navigator.share) {
      navigator.share({
        title: 'Join IceTop',
        text: shareText,
        url: stats.referralLink,
      }).catch(() => {
        // Fallback to copy if share fails
        handleCopyLink();
      });
    } else {
      // Fallback: open share URL in new tab
      window.open(shareUrl, '_blank');
    }
  };

  const displayLink = stats?.referralLink || 't.me/IceTopbot?start=...';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <div className="card">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <UsersIcon size={28} />
          Referral Program
        </h2>

        {/* Referral Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-dark-400 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold gradient-text">
              {loading ? '...' : stats?.totalReferrals || 0}
            </div>
            <div className="text-xs text-gray-400 mt-1">Total Referrals</div>
          </div>
          <div className="bg-dark-400 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-primary-500">
              {loading ? '...' : stats?.referrals?.length || 0}
            </div>
            <div className="text-xs text-gray-400 mt-1">Active</div>
          </div>
          <div className="bg-dark-400 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {loading ? '...' : stats?.totalPointsEarned || 0}
            </div>
            <div className="text-xs text-gray-400 mt-1">Meters Earned</div>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-gradient-to-r from-primary-500/20 to-primary-600/20 border border-primary-500/30 rounded-xl p-4 mb-6">
          <div className="text-sm text-gray-400 mb-2">Your Referral Link</div>
          <div className="bg-dark-400 rounded-lg p-3 mb-3 font-mono text-sm break-all">
            {displayLink}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopyLink}
              disabled={!stats?.referralLink}
              className="btn-secondary text-sm py-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ClipboardIcon size={18} />
              Copy Link
            </button>
            <button
              onClick={handleShare}
              disabled={!stats?.referralLink}
              className="btn-primary text-sm py-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShareIcon size={18} />
              Share Link
            </button>
          </div>
        </div>

        {/* Rewards Info */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <GiftIcon size={22} />
            Referral Rewards
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-dark-400 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <WaveIcon size={24} />
                <span className="text-sm">Level 1: Friend joins</span>
              </div>
              <span className="font-bold text-cyan-400">+100 m</span>
            </div>
            <div className="flex items-center justify-between bg-dark-400 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <LinkIcon size={24} />
                <span className="text-sm">Level 2: Friend's friend joins</span>
              </div>
              <span className="font-bold text-cyan-400">+25 m</span>
            </div>
            <div className="flex items-center justify-between bg-dark-400 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <StickerIcon size={24} />
                <span className="text-sm">Level 3: 3rd level referral</span>
              </div>
              <span className="font-bold text-cyan-400">+10 m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Referral List */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <ClipboardIcon size={22} />
          Your Referrals
        </h3>
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <p>Loading...</p>
          </div>
        ) : stats?.referrals && stats.referrals.length > 0 ? (
          <div className="space-y-2">
            {stats.referrals.map((ref, index) => (
              <div key={index} className="flex items-center justify-between bg-dark-400 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-400 text-sm font-bold">
                    {(ref.firstName?.[0] || ref.username?.[0] || '?').toUpperCase()}
                  </div>
                  <span className="text-sm">
                    {ref.username ? `@${ref.username}` : ref.firstName || 'User'}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(ref.joinedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="mb-4 flex justify-center">
              <UsersIcon size={64} className="opacity-50" />
            </div>
            <p>No referrals yet</p>
            <p className="text-sm mt-2">Share your link to start earning!</p>
          </div>
        )}
      </div>
    </div>
  );
}
