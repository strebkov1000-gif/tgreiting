import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useEffect, useState } from 'react';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Prizes from './pages/Prizes';
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

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      // Set header color - Dark blue theme
      if (tg.setHeaderColor) {
        tg.setHeaderColor('#0a1628');
      }

      // Set background color - Dark blue theme
      if (tg.setBackgroundColor) {
        tg.setBackgroundColor('#0a1628');
      }
    }
  }, []);

  return (
    <>
      {/* Loading Screen */}
      {isLoading && (
        <LoadingScreen
          onComplete={() => setIsLoading(false)}
          duration={2500}
        />
      )}

      {/* Main App */}
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/prizes" element={<Prizes />} />
          </Routes>
        </Layout>
      </Router>
    </TonConnectUIProvider>
    </>
  );
}

export default App;
