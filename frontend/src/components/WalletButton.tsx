import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useEffect, useState, useRef } from 'react';
import { useWalletScan } from '../hooks/useWalletScan';
import { useWalletScanStore } from '../store/walletScanStore';
import WalletScanProgress from './WalletScanProgress';
import { useLanguage } from '../i18n/LanguageContext';

const SCANNED_WALLET_KEY = 'ice_scanned_wallet';

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

// Refresh/Rescan icon - two circular arrows
const RefreshIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Check if wallet was already scanned (persisted in localStorage)
 */
function getScannedWallet(): string | null {
  try {
    return localStorage.getItem(SCANNED_WALLET_KEY);
  } catch {
    return null;
  }
}

/**
 * Mark wallet as scanned
 */
function setScannedWallet(address: string): void {
  try {
    localStorage.setItem(SCANNED_WALLET_KEY, address);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Clear scanned wallet record
 */
function clearScannedWallet(): void {
  try {
    localStorage.removeItem(SCANNED_WALLET_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

export default function WalletButton() {
  const { t } = useLanguage();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const { scanWallet, isScanning } = useWalletScan();
  const { reset, progress } = useWalletScanStore();
  const [showProgress, setShowProgress] = useState(false);
  const previousWalletRef = useRef<string | null>(null);
  const isFirstRenderRef = useRef(true);

  // Auto-disconnect wallet if it's already connected to another account
  useEffect(() => {
    if (progress.errorCode === 'WALLET_ALREADY_CONNECTED' && wallet) {
      // Clear the scanned wallet record since it failed
      clearScannedWallet();
      // Disconnect after a short delay so user can see the error message
      const timer = setTimeout(async () => {
        try {
          await tonConnectUI.disconnect();
          previousWalletRef.current = null;
        } catch (error) {
          console.error('Failed to disconnect wallet:', error);
        }
      }, 3500); // Slightly after the modal auto-closes
      return () => clearTimeout(timer);
    }
  }, [progress.errorCode, wallet, tonConnectUI]);

  // Trigger scan ONLY for NEW wallet connections
  // Not on app reload with existing wallet
  useEffect(() => {
    const currentAddress = wallet?.account?.address;
    const scannedWallet = getScannedWallet();

    // Skip on first render if wallet is already connected and scanned
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      if (currentAddress) {
        previousWalletRef.current = currentAddress;
        // If this wallet was already scanned, don't show progress
        if (scannedWallet === currentAddress) {
          return;
        }
      }
    }

    if (currentAddress && currentAddress !== previousWalletRef.current) {
      // NEW wallet connection detected
      previousWalletRef.current = currentAddress;

      // Only show progress if this is a different wallet than what we scanned before
      if (scannedWallet !== currentAddress) {
        setShowProgress(true);
        scanWallet(currentAddress);
        setScannedWallet(currentAddress);
      }
    } else if (!currentAddress && previousWalletRef.current) {
      // Wallet disconnected
      previousWalletRef.current = null;
      clearScannedWallet();
      reset();
    }
  }, [wallet?.account?.address, scanWallet, reset]);

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
      previousWalletRef.current = null;
      reset();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const handleRescan = () => {
    if (!wallet?.account?.address || isScanning) return;

    // Clear the scanned wallet record to force rescan
    clearScannedWallet();

    // Trigger new scan
    setShowProgress(true);
    scanWallet(wallet.account.address);
    setScannedWallet(wallet.account.address);
  };

  const handleCloseProgress = () => {
    setShowProgress(false);
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <>
      {wallet ? (
        <div className="flex items-center gap-2">
          {/* Connected wallet display */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold text-cyan-300">
              {formatAddress(wallet.account.address)}
            </span>
          </div>

          {/* Rescan button */}
          <button
            onClick={handleRescan}
            disabled={isScanning}
            className={`p-2 rounded-xl border transition-all ${
              isScanning
                ? 'bg-gray-500/20 border-gray-500/30 text-gray-400 cursor-not-allowed'
                : 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30'
            }`}
            title={t.wallet?.rescan || 'Rescan NFTs'}
          >
            <RefreshIcon className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          </button>

          {/* Disconnect button */}
          <button
            onClick={handleDisconnect}
            className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
            title={t.wallet?.disconnect || 'Disconnect wallet'}
          >
            <DisconnectIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm hover:from-cyan-400 hover:to-blue-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]"
        >
          <WalletIcon className="w-4 h-4" />
          <span>{t.wallet?.connect || 'Connect'}</span>
        </button>
      )}

      {/* Scan Progress Modal */}
      <WalletScanProgress
        isOpen={showProgress || isScanning}
        onClose={handleCloseProgress}
      />
    </>
  );
}
