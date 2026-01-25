import { Link, useLocation } from 'react-router-dom';
import SnowMountain from '../icons/SnowMountain';
import Snowman from '../icons/Snowman';
import Prize from '../icons/Prize';

const navItems = [
  { path: '/', icon: 'mountain', label: 'Top' },
  { path: '/profile', icon: 'snowman', label: 'Profile' },
  { path: '/prizes', icon: 'prize', label: 'Prizes' },
];

export default function IcyNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Background */}
      <div className="absolute inset-0 bg-[#081220]/95 backdrop-blur-xl border-t border-white/10" />

      {/* Navigation content */}
      <div className="relative max-w-7xl mx-auto px-4 pb-2 pt-3">
        <div className="grid grid-cols-3 gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="group relative"
              >
                {/* Button container */}
                <div className={`
                  relative overflow-hidden rounded-2xl transition-all duration-300
                  ${isActive
                    ? 'bg-blue-500/20 border-blue-500/50 shadow-[0_0_20px_rgba(33,150,243,0.4)]'
                    : 'bg-white/5 hover:bg-white/10 border-transparent'
                  }
                  border backdrop-blur-md
                `}>
                  {/* Content */}
                  <div className="relative flex flex-col items-center justify-center py-3 px-2">
                    {/* Icon */}
                    <div className={`
                      mb-1 transition-all duration-300
                      ${isActive
                        ? 'scale-110 drop-shadow-[0_0_8px_rgba(33,150,243,0.6)]'
                        : 'opacity-70 group-hover:opacity-100 group-hover:scale-105'
                      }
                    `}>
                      {item.icon === 'mountain' ? (
                        <SnowMountain size={28} />
                      ) : item.icon === 'snowman' ? (
                        <Snowman size={28} />
                      ) : item.icon === 'prize' ? (
                        <Prize size={28} />
                      ) : (
                        <span className="text-2xl">{item.icon}</span>
                      )}
                    </div>

                    {/* Label */}
                    <span className={`
                      text-xs font-semibold tracking-wide transition-all duration-300
                      ${isActive
                        ? 'text-blue-300'
                        : 'text-gray-400 group-hover:text-white'
                      }
                    `}>
                      {item.label}
                    </span>
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom safety padding for iOS */}
      <div className="h-safe-area-inset-bottom bg-[#081220]" />
    </nav>
  );
}
