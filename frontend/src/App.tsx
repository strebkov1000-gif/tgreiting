import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageProvider } from './i18n/LanguageContext';
import { NetworkErrorProvider } from './contexts/NetworkErrorContext';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Prizes from './pages/Prizes';
import Tasks from './pages/Tasks';
import Layout from './components/Layout/Layout';
import LoadingScreen from './components/LoadingScreen';

// Telegram Web App
declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

const manifestUrl = import.meta.env.VITE_TON_MANIFEST_URL || 'https://example.com/tonconnect-manifest.json';

// Key for tracking if initial load completed
const INITIAL_LOAD_KEY = 'icetop_initial_loaded';

// Animated Routes component
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{
          duration: 0.15,
          ease: 'easeOut',
        }}
        className="w-full min-h-full"
      >
        <Routes location={location}>
          <Route path="/" element={<Leaderboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/prizes" element={<Prizes />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  // Check if this is a fresh session or returning from minimize
  const isFirstLoad = useRef(!sessionStorage.getItem(INITIAL_LOAD_KEY));
  const [isLoading, setIsLoading] = useState(isFirstLoad.current);
  const [, setForceUpdate] = useState(0);

  // Force re-render function
  const forceRerender = useCallback(() => {
    setForceUpdate(prev => prev + 1);
  }, []);

  // Apply background color immediately to prevent flash
  const applyBackgroundColor = useCallback(() => {
    const bgColor = '#0a1628';
    document.body.style.backgroundColor = bgColor;
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.transition = 'none';
    document.documentElement.style.transition = 'none';

    // Force repaint
    void document.body.offsetHeight;
  }, []);

  // Initialize Telegram WebApp
  const initTelegramApp = useCallback(() => {
    // Always apply background first
    applyBackgroundColor();

    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();

      // Check if running on mobile platform
      const isMobile = ['android', 'android_x', 'ios'].includes(tg.platform || '');

      // Only expand to full screen on mobile devices
      if (isMobile) {
        tg.expand();

        // Request fullscreen mode if available (Telegram WebApp 7.7+)
        if (tg.requestFullscreen) {
          tg.requestFullscreen();
        }

        // Disable vertical swipes to close (keeps app open on swipe down)
        if (tg.disableVerticalSwipes) {
          tg.disableVerticalSwipes();
        }
      }

      // Enable closing confirmation
      if (tg.enableClosingConfirmation) {
        tg.enableClosingConfirmation();
      }

      // Set header color - Dark blue theme
      if (tg.setHeaderColor) {
        tg.setHeaderColor('#0a1628');
      }

      // Set background color - Dark blue theme
      if (tg.setBackgroundColor) {
        tg.setBackgroundColor('#0a1628');
      }

      // Set bottom bar color for fullscreen mode
      if (tg.setBottomBarColor) {
        tg.setBottomBarColor('#0a1628');
      }

      // Set viewport height for mobile
      const setVh = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      setVh();
      window.addEventListener('resize', setVh);
    }
  }, [applyBackgroundColor]);

  // Apply background immediately on mount
  useEffect(() => {
    applyBackgroundColor();
  }, [applyBackgroundColor]);

  useEffect(() => {
    initTelegramApp();

    // Handle visibility change (when app is minimized/restored)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-apply background immediately to prevent blue flash
        applyBackgroundColor();
        // Re-initialize when app becomes visible
        initTelegramApp();
        forceRerender();
      }
    };

    // Handle Telegram WebApp viewport changes
    const handleViewportChanged = () => {
      applyBackgroundColor();
      initTelegramApp();
      forceRerender();
    };

    // Handle Telegram WebApp activated event (critical for minimize/restore)
    const handleActivated = () => {
      applyBackgroundColor();
      initTelegramApp();
      forceRerender();
    };

    // Handle page show (back/forward navigation, restore from bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      applyBackgroundColor();
      if (event.persisted) {
        initTelegramApp();
        forceRerender();
      }
    };

    // Handle focus
    const handleFocus = () => {
      applyBackgroundColor();
      initTelegramApp();
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);

    // Telegram WebApp events
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.onEvent('viewportChanged', handleViewportChanged);
      window.Telegram.WebApp.onEvent('activated', handleActivated);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.offEvent('viewportChanged', handleViewportChanged);
        window.Telegram.WebApp.offEvent('activated', handleActivated);
      }
    };
  }, [initTelegramApp, forceRerender, applyBackgroundColor]);

  // Handle loading complete
  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
    // Mark that initial load is done for this session
    sessionStorage.setItem(INITIAL_LOAD_KEY, 'true');
  }, []);

  // Show only LoadingScreen until complete (only on first load)
  if (isLoading && isFirstLoad.current) {
    return (
      <LoadingScreen
        duration={2500}
        onComplete={handleLoadingComplete}
      />
    );
  }

  return (
    <NetworkErrorProvider>
      <LanguageProvider>
        <TonConnectUIProvider manifestUrl={manifestUrl}>
          <Router>
            <Layout>
              <AnimatedRoutes />
            </Layout>
          </Router>
        </TonConnectUIProvider>
      </LanguageProvider>
    </NetworkErrorProvider>
  );
}

export default App;
