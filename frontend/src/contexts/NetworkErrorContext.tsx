import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface NetworkErrorContextType {
  showNetworkError: boolean;
  triggerNetworkError: () => void;
  clearNetworkError: () => void;
}

const NetworkErrorContext = createContext<NetworkErrorContextType | null>(null);

export function NetworkErrorProvider({ children }: { children: ReactNode }) {
  const [showNetworkError, setShowNetworkError] = useState(false);

  const triggerNetworkError = useCallback(() => {
    setShowNetworkError(true);
  }, []);

  const clearNetworkError = useCallback(() => {
    setShowNetworkError(false);
  }, []);

  return (
    <NetworkErrorContext.Provider value={{ showNetworkError, triggerNetworkError, clearNetworkError }}>
      {children}

      {/* Network Error Modal */}
      {showNetworkError && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]" />

          {/* Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl">
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#1a1a2e]" />
              <div className="absolute inset-0 border border-red-500/30 rounded-2xl" />

              {/* Content */}
              <div className="relative p-6 text-center">
                {/* Error Icon */}
                <div className="w-20 h-20 mx-auto mb-4 relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse" />
                  <div className="relative w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-white mb-2">
                  Ошибка сети
                </h2>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                  Сессия истекла или произошла ошибка соединения. Пожалуйста, перезапустите приложение.
                </p>

                {/* Restart Button */}
                <button
                  onClick={() => {
                    // Clear session storage and reload
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-sm hover:from-red-400 hover:to-orange-400 transition-all shadow-lg shadow-red-500/30"
                >
                  Перезапустить
                </button>

                {/* Alternative: Close app for Telegram */}
                <button
                  onClick={() => {
                    const tg = window.Telegram?.WebApp;
                    if (tg?.close) {
                      tg.close();
                    } else {
                      sessionStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full mt-3 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-medium text-sm hover:bg-white/10 transition-all"
                >
                  Закрыть приложение
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </NetworkErrorContext.Provider>
  );
}

export function useNetworkError() {
  const context = useContext(NetworkErrorContext);
  if (!context) {
    throw new Error('useNetworkError must be used within NetworkErrorProvider');
  }
  return context;
}

/**
 * Helper function to handle API responses and trigger network error on 401
 */
export async function handleApiResponse(response: Response, triggerError: () => void): Promise<Response> {
  if (response.status === 401 || response.status === 403) {
    triggerError();
    throw new Error('Unauthorized');
  }
  return response;
}
