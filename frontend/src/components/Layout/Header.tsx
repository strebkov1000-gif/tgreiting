import WalletButton from '../WalletButton';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#0a1929]/90 backdrop-blur-xl border-b border-cyan-900/30">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Beta badge */}
          <div className="flex items-center">
            <span className="text-xs text-cyan-600 px-2 py-1 rounded-lg bg-cyan-950/50 border border-cyan-800/30">
              Beta
            </span>
          </div>

          {/* Wallet connect button */}
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
