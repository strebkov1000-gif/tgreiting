import { Link, useLocation } from 'react-router-dom';
import SnowMountain from '../icons/SnowMountain';
import Snowman from '../icons/Snowman';
import Prize from '../icons/Prize';

const navItems = [
  { path: '/', icon: 'mountain', label: 'Top' },
  { path: '/profile', icon: 'snowman', label: 'Profile' },
  { path: '/prizes', icon: 'prize', label: 'Prizes' },
];

export default function Navigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-600/95 backdrop-blur-xl border-t border-white/10">
      <div className="max-w-7xl mx-auto px-2">
        <div className="grid grid-cols-3 gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-3 transition-all duration-200 ${
                  isActive
                    ? 'text-accent-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-2xl mb-1">
                  {item.icon === 'mountain' ? (
                    <SnowMountain size={24} />
                  ) : item.icon === 'snowman' ? (
                    <Snowman size={24} />
                  ) : item.icon === 'prize' ? (
                    <Prize size={24} />
                  ) : (
                    item.icon
                  )}
                </span>
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 w-12 h-0.5 bg-accent-400 rounded-t" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
