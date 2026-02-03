import { useState, useEffect } from 'react';
import WalletButton from '../WalletButton';
import LanguageSwitcher from '../LanguageSwitcher';

export default function Header() {
  const [topOffset, setTopOffset] = useState(0);

  useEffect(() => {
    const updateOffset = () => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        // safeAreaInset = notch/dynamic island area
        // contentSafeAreaInset = Telegram header with close button
        const safeArea = tg.safeAreaInset?.top || 0;
        const contentSafeArea = tg.contentSafeAreaInset?.top || 0;

        // If both are 0, use a sensible fallback for iOS
        // Telegram header is typically 44-56px
        const calculatedOffset = safeArea + contentSafeArea;
        setTopOffset(calculatedOffset > 0 ? calculatedOffset : 0);
      }
    };

    updateOffset();

    // Small delay to ensure Telegram SDK is fully initialized
    const timer = setTimeout(updateOffset, 100);

    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.onEvent('viewportChanged', updateOffset);
      window.Telegram.WebApp.onEvent('safeAreaChanged', updateOffset);
      window.Telegram.WebApp.onEvent('contentSafeAreaChanged', updateOffset);
      window.Telegram.WebApp.onEvent('fullscreenChanged', updateOffset);
    }

    return () => {
      clearTimeout(timer);
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.offEvent('viewportChanged', updateOffset);
        window.Telegram.WebApp.offEvent('safeAreaChanged', updateOffset);
        window.Telegram.WebApp.offEvent('contentSafeAreaChanged', updateOffset);
        window.Telegram.WebApp.offEvent('fullscreenChanged', updateOffset);
      }
    };
  }, []);

  return (
    <header
      className="relative z-10 bg-[#0a1929]/95 backdrop-blur-xl border-b border-cyan-900/30"
      style={{
        marginTop: topOffset > 0 ? `${topOffset}px` : 'env(safe-area-inset-top, 0px)'
      }}
    >
      {/* Content */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <LanguageSwitcher />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
