import { create } from 'zustand';

/**
 * Scan step types for wallet scanning progress
 */
export type ScanStep =
  | 'idle'
  | 'calculating_position'   // Считаем ваше место на горе
  | 'counting_stickers'      // Считаем количество стикеров в кошельке
  | 'counting_hold_days'     // Считаем сколько дней вы холдите
  | 'checking_clubs'         // Считаем в каких клубах вы состоите
  | 'complete'
  | 'error';

/**
 * Result of wallet scan
 */
export interface WalletScanResult {
  nftsFound: number;
  nftsAdded: number;
  pointsAwarded: number;
  totalPoints: number;
  rank: number | null;
  holdDays: number;
  clubsCount: number;
}

/**
 * Error codes for specific errors
 */
export type ScanErrorCode = 'WALLET_ALREADY_CONNECTED' | 'GENERIC_ERROR' | null;

/**
 * Scan progress state
 */
interface ScanProgress {
  currentStep: ScanStep;
  stepIndex: number;
  totalSteps: number;
  error: string | null;
  errorCode: ScanErrorCode;
  scanResult: WalletScanResult | null;
}

/**
 * Wallet scan store interface
 */
interface WalletScanStore {
  // State
  isScanning: boolean;
  progress: ScanProgress;

  // Actions
  startScan: () => void;
  setStep: (step: ScanStep) => void;
  setError: (error: string, code?: ScanErrorCode) => void;
  setResult: (result: WalletScanResult) => void;
  reset: () => void;
}

/**
 * Ordered list of scan steps
 */
export const SCAN_STEPS: ScanStep[] = [
  'calculating_position',
  'counting_stickers',
  'counting_hold_days',
  'checking_clubs'
];

/**
 * Step messages in Russian
 */
export const STEP_MESSAGES: Record<ScanStep, string> = {
  idle: '',
  calculating_position: 'Считаем ваше место на горе',
  counting_stickers: 'Считаем количество стикеров в кошельке',
  counting_hold_days: 'Считаем сколько дней вы холдите',
  checking_clubs: 'Считаем в каких клубах вы состоите',
  complete: 'Готово!',
  error: 'Произошла ошибка'
};

/**
 * Step icons
 */
export const STEP_ICONS: Record<ScanStep, string> = {
  idle: '❄️',
  calculating_position: '⛰️',
  counting_stickers: '🎨',
  counting_hold_days: '📅',
  checking_clubs: '👥',
  complete: '✅',
  error: '❌'
};

/**
 * Initial progress state
 */
const initialProgress: ScanProgress = {
  currentStep: 'idle',
  stepIndex: 0,
  totalSteps: SCAN_STEPS.length,
  error: null,
  errorCode: null,
  scanResult: null
};

/**
 * Zustand store for wallet scanning state
 */
export const useWalletScanStore = create<WalletScanStore>((set) => ({
  isScanning: false,
  progress: initialProgress,

  startScan: () => {
    set({
      isScanning: true,
      progress: {
        ...initialProgress,
        currentStep: 'calculating_position',
        stepIndex: 0
      }
    });
  },

  setStep: (step: ScanStep) => {
    const stepIndex = SCAN_STEPS.indexOf(step);
    set(state => ({
      progress: {
        ...state.progress,
        currentStep: step,
        stepIndex: stepIndex >= 0 ? stepIndex : state.progress.stepIndex
      }
    }));
  },

  setError: (error: string, code: ScanErrorCode = 'GENERIC_ERROR') => {
    set(state => ({
      isScanning: false,
      progress: {
        ...state.progress,
        currentStep: 'error',
        error,
        errorCode: code
      }
    }));
  },

  setResult: (result: WalletScanResult) => {
    set({
      isScanning: false,
      progress: {
        currentStep: 'complete',
        stepIndex: SCAN_STEPS.length,
        totalSteps: SCAN_STEPS.length,
        error: null,
        errorCode: null,
        scanResult: result
      }
    });
  },

  reset: () => {
    set({
      isScanning: false,
      progress: initialProgress
    });
  }
}));
