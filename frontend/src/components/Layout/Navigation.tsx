import { Link, useLocation } from 'react-router-dom';
import SnowMountain from '../icons/SnowMountain';
import Snowman from '../icons/Snowman';
import Prize from '../icons/Prize';

// Tasks icon component
const TasksIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const navItems = [
  { path: '/', icon: 'mountain', label: 'Top' },
  { path: '/tasks', icon: 'tasks', label: 'Tasks' },
  { path: '/profile', icon: 'snowman', label: 'Profile' },
  { path: '/prizes', icon: 'prize', label: 'Prizes' },
];

export default function Navigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-600/95 backdrop-blur-xl border-t border-white/10">
      <div className="max-w-7xl mx-auto px-2">
        <div className="grid grid-cols-4 gap-1">
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
                  ) : item.icon === 'tasks' ? (
                    <TasksIcon size={24} />
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
