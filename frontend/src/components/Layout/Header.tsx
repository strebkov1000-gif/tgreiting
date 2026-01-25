export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-dark-400/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-3xl">🧊</span>
            <h1 className="text-xl font-bold gradient-text">Ice Rating</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Beta</span>
          </div>
        </div>
      </div>
    </header>
  );
}
