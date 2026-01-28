import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useCallback, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://icetop.app/api';

// Wallet icon
const WalletIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Disconnect icon
const DisconnectIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="16,17 21,12 16,7" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function WalletButton() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  // Send wallet address to backend when connected
  const saveWalletToBackend = useCallback(async (address: string) => {
    try {
      const initData = window.Telegram?.WebApp?.initData || '';

      await fetch(`${API_URL}/user/wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
        body: JSON.stringify({ walletAddress: address }),
      });
    } catch (error) {
      console.error('Failed to save wallet:', error);
    }
  }, []);

  useEffect(() => {
    if (wallet?.account?.address) {
      saveWalletToBackend(wallet.account.address);
    }
  }, [wallet?.account?.address, saveWalletToBackend]);

  const handleConnect = async () => {
    try {
      await tonConnectUI.openModal();
    } catch (error) {
      console.error('Failed to open wallet modal:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await tonConnectUI.disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        {/* Connected wallet display */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-semibold text-cyan-300">
            {formatAddress(wallet.account.address)}
          </span>
        </div>

        {/* Disconnect button */}
        <button
          onClick={handleDisconnect}
          className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
          title="Disconnect wallet"
        >
          <DisconnectIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm hover:from-cyan-400 hover:to-blue-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]"
    >
      <WalletIcon className="w-4 h-4" />
      <span>Connect</span>
    </button>
  );
}
