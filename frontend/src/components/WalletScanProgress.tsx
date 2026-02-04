import { useEffect, useState } from 'react';
import {
  useWalletScanStore,
  SCAN_STEPS,
  ScanStep
} from '../store/walletScanStore';
import { useLanguage } from '../i18n/LanguageContext';

// Animated icon components
const ScanningIcon = () => (
  <div className="relative w-8 h-8">
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
    </div>
  </div>
);

const SuccessIcon = () => (
  <div className="relative w-8 h-8 flex items-center justify-center">
    <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
    <div className="relative w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  </div>
);

const ErrorIcon = () => (
  <div className="relative w-8 h-8 flex items-center justify-center">
    <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse" />
    <div className="relative w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  </div>
);

const WarningIcon = () => (
  <div className="relative w-8 h-8 flex items-center justify-center">
    <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-pulse" />
    <div className="relative w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
      </svg>
    </div>
  </div>
);

const WalletIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const NftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const PointsIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Step icons map
const ANIMATED_STEP_ICONS: Record<string, React.ReactNode> = {
  calculating_position: <PointsIcon />,
  counting_stickers: <NftIcon />,
  counting_hold_days: <DatabaseIcon />,
  checking_clubs: <WalletIcon />
};

interface WalletScanProgressProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal component showing wallet scan progress with steps
 */
export default function WalletScanProgress({ isOpen, onClose }: WalletScanProgressProps) {
  const { progress, isScanning, reset } = useWalletScanStore();
  const [showResult, setShowResult] = useState(false);
  const { t } = useLanguage();

  // Step messages based on current language
  const stepMessages: Record<ScanStep, string> = {
    idle: '',
    calculating_position: t.scan.calculatingPosition,
    counting_stickers: t.scan.countingStickers,
    counting_hold_days: t.scan.countingHoldDays,
    checking_clubs: t.scan.checkingClubs,
    complete: t.scan.done,
    error: t.scan.errorOccurred
  };

  // Auto-close after completion
  useEffect(() => {
    if (progress.currentStep === 'complete') {
      setShowResult(true);
      const timer = setTimeout(() => {
        setShowResult(false);
        onClose();
        reset();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [progress.currentStep, onClose, reset]);

  if (!isOpen) return null;

  const currentStepIndex = SCAN_STEPS.indexOf(progress.currentStep as ScanStep);
  const progressPercent = progress.currentStep === 'complete'
    ? 100
    : progress.currentStep === 'error'
    ? 0
    : ((currentStepIndex + 1) / SCAN_STEPS.length) * 100;

  // Main icon based on state
  const renderMainIcon = () => {
    if (progress.currentStep === 'complete') {
      return <SuccessIcon />;
    }
    if (progress.currentStep === 'error') {
      if (progress.errorCode === 'WALLET_ALREADY_CONNECTED') {
        return <WarningIcon />;
      }
      return <ErrorIcon />;
    }
    return <ScanningIcon />;
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fade-in" />

      {/* Modal - positioned from top for Telegram Mini App */}
      <div className="fixed inset-x-0 top-0 bottom-0 z-50 flex items-start justify-center p-4 pt-[25vh]">
        <div className="relative w-full max-w-sm overflow-hidden rounded-2xl animate-fade-in">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c1c2e] via-[#0f2744] to-[#0c1c2e]" />
          <div className="absolute inset-0 border border-cyan-500/30 rounded-2xl" />

          {/* Glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-cyan-500/20 rounded-full blur-3xl" />

          {/* Close button */}
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-cyan-900/80 border border-cyan-700/50 flex items-center justify-center text-cyan-500 hover:text-cyan-300 hover:bg-cyan-800/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative p-6">
            {/* Header with animated icon */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 relative flex items-center justify-center">
                {/* Animated outer rings */}
                <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full" />
                {isScanning && (
                  <>
                    <div
                      className="absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin"
                      style={{ animationDuration: '1.5s' }}
                    />
                    <div
                      className="absolute inset-2 border-2 border-transparent border-b-blue-400 rounded-full animate-spin"
                      style={{ animationDuration: '2s', animationDirection: 'reverse' }}
                    />
                  </>
                )}
                {/* Main icon */}
                <div className="relative z-10 scale-150">
                  {renderMainIcon()}
                </div>
              </div>
              <h3 className="text-lg font-bold text-cyan-200">
                {showResult ? t.scan.complete :
                 progress.currentStep === 'error' && progress.errorCode === 'WALLET_ALREADY_CONNECTED' ? t.scan.walletAlreadyUsed :
                 progress.currentStep === 'error' ? t.scan.error :
                 t.scan.scanning}
              </h3>
            </div>

            {/* Progress Steps */}
            <div className="space-y-3 mb-6">
              {SCAN_STEPS.map((step, index) => {
                const isActive = step === progress.currentStep;
                const isComplete = currentStepIndex > index || progress.currentStep === 'complete';

                return (
                  <div
                    key={step}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-cyan-500/15 border border-cyan-500/30'
                        : isComplete
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'bg-cyan-950/30 border border-cyan-800/30 opacity-50'
                    }`}
                  >
                    {/* Step icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isComplete
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isActive
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-cyan-900/50 text-cyan-700'
                    }`}>
                      {isComplete ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        ANIMATED_STEP_ICONS[step] || <WalletIcon />
                      )}
                    </div>

                    {/* Step message */}
                    <span className={`text-sm font-medium flex-1 ${
                      isComplete
                        ? 'text-emerald-400'
                        : isActive
                        ? 'text-cyan-300'
                        : 'text-cyan-600'
                    }`}>
                      {stepMessages[step]}
                    </span>

                    {/* Loading indicator */}
                    {isActive && (
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 bg-cyan-950/50 rounded-full overflow-hidden mb-4">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Result Summary (when complete) */}
            {showResult && progress.scanResult && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center animate-fade-in">
                <div className="text-3xl font-black text-emerald-400 mb-1">
                  +{progress.scanResult.pointsAwarded}
                </div>
                <div className="text-sm text-emerald-500">{t.scan.metersAdded}</div>
                {progress.scanResult.nftsFound > 0 && (
                  <div className="text-xs text-cyan-600 mt-2">
                    {t.scan.nftsFound.replace('{count}', String(progress.scanResult.nftsFound))}
                  </div>
                )}
                {progress.scanResult.rank && (
                  <div className="text-xs text-cyan-500 mt-1">
                    {t.scan.yourPosition.replace('{rank}', String(progress.scanResult.rank))}
                  </div>
                )}
              </div>
            )}

            {/* Error State */}
            {progress.currentStep === 'error' && (
              <div className={`rounded-xl p-4 text-center ${
                progress.errorCode === 'WALLET_ALREADY_CONNECTED'
                  ? 'bg-amber-500/10 border border-amber-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                {/* Animated icon for error states */}
                <div className="flex justify-center mb-3">
                  {progress.errorCode === 'WALLET_ALREADY_CONNECTED' ? (
                    <div className="scale-150"><WarningIcon /></div>
                  ) : (
                    <div className="scale-150"><ErrorIcon /></div>
                  )}
                </div>
                <div className={`mb-3 text-sm font-medium ${
                  progress.errorCode === 'WALLET_ALREADY_CONNECTED'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}>
                  {progress.error}
                </div>
                {progress.errorCode === 'WALLET_ALREADY_CONNECTED' && (
                  <div className="text-xs text-amber-500/70 mb-3">
                    {t.scan.walletAlreadyUsedDesc}
                  </div>
                )}
                <button
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 text-sm hover:bg-cyan-500/30 transition-all"
                >
                  {t.scan.close}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
