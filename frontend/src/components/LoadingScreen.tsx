import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export default function LoadingScreen({ onComplete, duration = 2000 }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = 50;
    const steps = duration / interval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => {
              onComplete?.();
            }, 500);
          }, 300);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${
        progress >= 100 ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        backgroundImage: 'url(/images/loading.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-[#0a1628]/40" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-8">
        {/* Title */}
        <div className="text-center animate-fade-in">
          <h1 className="text-6xl font-bold mb-2 flex items-center justify-center gap-4">
            <span className="inline-block animate-spin-slow text-8xl text-[#ADD8E6] drop-shadow-[0_0_8px_rgba(173,216,230,0.8)]">
              ❄
            </span>
            <span className="text-[#ADD8E6] drop-shadow-[0_0_8px_rgba(173,216,230,0.6)]">
              IceTop
            </span>
          </h1>
          <p className="text-gray-300 text-lg font-medium">by Ice Creators</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-xs">
          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                boxShadow: '0 0 20px rgba(33,150,243,0.6)'
              }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full"
              style={{
                width: `${progress}%`,
                animation: 'shine 1.5s infinite',
              }}
            />
          </div>

          <div className="text-center mt-4">
            <span className="text-sm font-bold bg-gradient-to-r from-cyan-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}>
              Freezing... {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
