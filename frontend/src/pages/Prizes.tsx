import Prize from '../components/icons/Prize';
import { TrophyIcon, DiamondIcon, TargetIcon, StickerIcon, MedalIcon } from '../components/icons/IceIcons';

export default function Prizes() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1929] via-[#0d2137] to-[#0a1929]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Prize size={32} className="text-cyan-400" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Prizes
          </h1>
        </div>

        {/* Prize List */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c1c2e]/80 to-[#0f2744]/60" />
          <div className="absolute inset-0 border border-cyan-500/20 rounded-2xl" />

          {/* Aurora glow */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 p-5">
            <div className="space-y-3">
              {/* NFTs-PFPs */}
              <div className="flex items-center gap-4 p-4 bg-cyan-950/30 rounded-xl border border-cyan-800/30 hover:border-cyan-500/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                  <DiamondIcon size={28} className="text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-cyan-200">NFTs & PFPs</div>
                  <div className="text-sm text-cyan-600">Exclusive profile pictures and collectibles</div>
                </div>
              </div>

              {/* Stickers */}
              <div className="flex items-center gap-4 p-4 bg-cyan-950/30 rounded-xl border border-cyan-800/30 hover:border-cyan-500/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl flex items-center justify-center border border-yellow-500/30">
                  <StickerIcon size={28} className="text-yellow-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-cyan-200">Stickers</div>
                  <div className="text-sm text-cyan-600">Unique Telegram sticker packs</div>
                </div>
              </div>

              {/* TG GIFTS */}
              <div className="flex items-center gap-4 p-4 bg-cyan-950/30 rounded-xl border border-cyan-800/30 hover:border-cyan-500/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                  <TrophyIcon size={28} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-cyan-200">TG Gifts</div>
                  <div className="text-sm text-cyan-600">Premium Telegram gifts and perks</div>
                </div>
              </div>

              {/* WLs */}
              <div className="flex items-center gap-4 p-4 bg-cyan-950/30 rounded-xl border border-cyan-800/30 hover:border-cyan-500/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                  <TargetIcon size={28} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-cyan-200">Whitelists</div>
                  <div className="text-sm text-cyan-600">Early access to partner projects</div>
                </div>
              </div>

              {/* Achievements */}
              <div className="flex items-center gap-4 p-4 bg-cyan-950/30 rounded-xl border border-cyan-800/30 hover:border-cyan-500/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                  <MedalIcon size={28} className="text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-cyan-200">Achievements</div>
                  <div className="text-sm text-cyan-600">Unlock badges and bonus rewards</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
