import { useCallback } from 'react';
import { useWalletScanStore, WalletScanResult } from '../store/walletScanStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://icetop.app/api';

interface ApiErrorResponse {
  error: string;
  code?: string;
  message: string;
}

/**
 * Delay utility for visual feedback
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Hook for wallet scanning with progress tracking
 */
export function useWalletScan() {
  const { startScan, setStep, setError, setResult, reset, isScanning } = useWalletScanStore();

  /**
   * Perform wallet scan with progress steps
   */
  const scanWallet = useCallback(async (walletAddress: string) => {
    if (isScanning) return;

    const initData = window.Telegram?.WebApp?.initData || '';
    const userData = window.Telegram?.WebApp?.initDataUnsafe?.user;

    try {
      startScan();

      // Step 1: Calculating position
      await delay(600);
      setStep('counting_stickers');

      // Step 2: Save wallet and trigger scan
      await delay(500);

      // Save wallet address
      const saveResponse = await fetch(`${API_URL}/user/wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (!saveResponse.ok) {
        // Check for specific error codes
        try {
          const errorData: ApiErrorResponse = await saveResponse.json();
          if (errorData.code === 'WALLET_ALREADY_CONNECTED') {
            setError(errorData.message || 'Этот кошелек уже подключен к другому аккаунту', 'WALLET_ALREADY_CONNECTED');
            return;
          }
          throw new Error(errorData.message || 'Не удалось сохранить кошелёк');
        } catch (parseError) {
          throw new Error('Не удалось сохранить кошелёк');
        }
      }

      setStep('counting_hold_days');
      await delay(500);

      // Trigger NFT scan if user ID is available
      let scanData: any = null;
      if (userData?.id) {
        try {
          const scanResponse = await fetch(
            `${API_URL}/nft/scan/${userData.id}`,
            {
              method: 'POST',
              headers: {
                'x-telegram-init-data': initData,
              },
            }
          );

          if (scanResponse.ok) {
            scanData = await scanResponse.json();
          }
        } catch (scanError) {
          console.warn('NFT scan error:', scanError);
        }
      }

      setStep('checking_clubs');
      await delay(500);

      // Get extended user profile for additional data (hold days, clubs)
      let profileData: any = null;
      if (userData?.id) {
        try {
          const profileResponse = await fetch(
            `${API_URL}/user/${userData.id}/extended`,
            {
              headers: {
                'x-telegram-init-data': initData,
              },
            }
          );

          if (profileResponse.ok) {
            profileData = await profileResponse.json();
          }
        } catch (profileError) {
          console.warn('Profile fetch error:', profileError);
        }
      }

      await delay(400);

      // Compose result from scan and profile data
      const result: WalletScanResult = {
        nftsFound: scanData?.result?.nftsFound || profileData?.nftsCount || 0,
        nftsAdded: scanData?.result?.nftsAdded || 0,
        pointsAwarded: scanData?.result?.pointsAwarded || 0,
        totalPoints: profileData?.user?.totalPoints || 0,
        rank: profileData?.rank || null,
        holdDays: profileData?.holdDays || 0,
        clubsCount: profileData?.clubsCount || 0
      };

      setResult(result);
    } catch (error) {
      console.error('Wallet scan error:', error);
      setError(error instanceof Error ? error.message : 'Ошибка сканирования');
    }
  }, [isScanning, startScan, setStep, setError, setResult]);

  return {
    scanWallet,
    isScanning,
    reset
  };
}

