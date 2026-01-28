// Beautiful ice-themed SVG icons

interface IconProps {
  className?: string;
  size?: number;
}

// Achievement Medal Icon
export const MedalIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="medalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="100%" stopColor="#0EA5E9" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="14" r="7" fill="url(#medalGradient)" opacity="0.9"/>
    <circle cx="12" cy="14" r="5" fill="none" stroke="#BAE6FD" strokeWidth="1"/>
    <path d="M9 2L7 8H17L15 2H9Z" fill="url(#medalGradient)" opacity="0.7"/>
    <path d="M12 11L13.5 13.5L12 16L10.5 13.5L12 11Z" fill="#F0F9FF"/>
  </svg>
);

// Lock Icon (for locked achievements)
export const LockIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="lockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#164E63" />
        <stop offset="100%" stopColor="#0E7490" />
      </linearGradient>
    </defs>
    <rect x="5" y="10" width="14" height="10" rx="2" fill="url(#lockGradient)"/>
    <path d="M8 10V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V10" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="15" r="1.5" fill="#67E8F9"/>
  </svg>
);

// Gift Icon
export const GiftIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="giftGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22D3EE" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
    </defs>
    <rect x="3" y="10" width="18" height="11" rx="2" fill="url(#giftGradient)" opacity="0.9"/>
    <rect x="3" y="6" width="18" height="5" rx="1" fill="#67E8F9"/>
    <path d="M12 6V21" stroke="#0E7490" strokeWidth="2"/>
    <path d="M3 11H21" stroke="#0E7490" strokeWidth="1" opacity="0.5"/>
    <path d="M12 6C12 6 10 4 8 4C6 4 5 5 5 6" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 6C12 6 14 4 16 4C18 4 19 5 19 6" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Rocket Icon
export const RocketIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="rocketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E0F2FE" />
        <stop offset="50%" stopColor="#67E8F9" />
        <stop offset="100%" stopColor="#0EA5E9" />
      </linearGradient>
    </defs>
    <path d="M12 2C12 2 6 8 6 14C6 17 8 20 12 22C16 20 18 17 18 14C18 8 12 2 12 2Z" fill="url(#rocketGradient)"/>
    <circle cx="12" cy="12" r="2" fill="#0C4A6E"/>
    <path d="M6 14L3 16L5 18L6 14Z" fill="#22D3EE"/>
    <path d="M18 14L21 16L19 18L18 14Z" fill="#22D3EE"/>
    <ellipse cx="12" cy="20" rx="2" ry="1" fill="#F97316" opacity="0.8"/>
  </svg>
);

// Trophy Icon
export const TrophyIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="trophyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF3C7" />
        <stop offset="50%" stopColor="#FCD34D" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
    <path d="M6 4H18V10C18 13.3137 15.3137 16 12 16C8.68629 16 6 13.3137 6 10V4Z" fill="url(#trophyGradient)"/>
    <path d="M6 6H3C3 9 4 11 6 11V6Z" fill="#FBBF24"/>
    <path d="M18 6H21C21 9 20 11 18 11V6Z" fill="#FBBF24"/>
    <rect x="10" y="16" width="4" height="3" fill="#D97706"/>
    <rect x="8" y="19" width="8" height="2" rx="1" fill="#B45309"/>
    <path d="M10 8L12 10L14 8" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Diamond Icon
export const DiamondIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="diamondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E0F2FE" />
        <stop offset="30%" stopColor="#67E8F9" />
        <stop offset="70%" stopColor="#22D3EE" />
        <stop offset="100%" stopColor="#0EA5E9" />
      </linearGradient>
    </defs>
    <path d="M12 2L3 9L12 22L21 9L12 2Z" fill="url(#diamondGradient)"/>
    <path d="M3 9H21" stroke="#BAE6FD" strokeWidth="1"/>
    <path d="M12 2L9 9L12 22L15 9L12 2Z" fill="#A5F3FC" opacity="0.5"/>
    <path d="M12 2L12 9" stroke="#E0F2FE" strokeWidth="1"/>
  </svg>
);

// Target Icon
export const TargetIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="targetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22D3EE" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="none" stroke="url(#targetGradient)" strokeWidth="2"/>
    <circle cx="12" cy="12" r="6" fill="none" stroke="#67E8F9" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill="#22D3EE"/>
    <path d="M12 2V6" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 18V22" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/>
    <path d="M2 12H6" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 12H22" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Wave/Hello Icon
export const WaveIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF3C7" />
        <stop offset="100%" stopColor="#FCD34D" />
      </linearGradient>
    </defs>
    <path d="M7 12C7 10 8.5 8 11 8V4C8 4 5 6.5 5 10C5 11 5.2 12 5.5 13L7 12Z" fill="url(#waveGradient)"/>
    <path d="M11 4V8C13 8 14.5 9 15 11L18 9C17 6 14.5 4 11 4Z" fill="url(#waveGradient)"/>
    <path d="M18 9L15 11C15.5 13 16 15 14 18L17 20C20 16 19 12 18 9Z" fill="url(#waveGradient)"/>
    <path d="M14 18C12 21 8 21 6 19L4 21C7 24 12 24 15 21L14 18Z" fill="url(#waveGradient)"/>
    <circle cx="9" cy="11" r="1" fill="#F59E0B"/>
    <path d="M6 15C3 15 2 17 2 19" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Chart/Stats Icon
export const ChartIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="chartGradient" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#22D3EE" />
      </linearGradient>
    </defs>
    <rect x="3" y="14" width="4" height="7" rx="1" fill="url(#chartGradient)" opacity="0.6"/>
    <rect x="10" y="10" width="4" height="11" rx="1" fill="url(#chartGradient)" opacity="0.8"/>
    <rect x="17" y="6" width="4" height="15" rx="1" fill="url(#chartGradient)"/>
    <path d="M5 12L12 5L19 8" stroke="#67E8F9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="5" cy="12" r="2" fill="#22D3EE"/>
    <circle cx="12" cy="5" r="2" fill="#22D3EE"/>
    <circle cx="19" cy="8" r="2" fill="#22D3EE"/>
  </svg>
);

// Fire/Streak Icon
export const FireIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="fireGradient" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#DC2626" />
        <stop offset="50%" stopColor="#F97316" />
        <stop offset="100%" stopColor="#FBBF24" />
      </linearGradient>
    </defs>
    <path d="M12 2C12 2 8 6 8 10C8 12 9 13 10 14C9 15 8 16 8 18C8 21 10 23 12 23C14 23 16 21 16 18C16 16 15 15 14 14C15 13 16 12 16 10C16 6 12 2 12 2Z" fill="url(#fireGradient)"/>
    <path d="M12 8C12 8 10 10 10 12C10 14 11 15 12 15C13 15 14 14 14 12C14 10 12 8 12 8Z" fill="#FEF3C7"/>
    <ellipse cx="12" cy="20" rx="2" ry="1.5" fill="#FBBF24" opacity="0.6"/>
  </svg>
);

// Link/Chain Icon
export const LinkIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="100%" stopColor="#0EA5E9" />
      </linearGradient>
    </defs>
    <path d="M10 13C10.4295 13.5741 10.9774 14.0492 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9404 15.7513 14.6898C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59699 21.9548 8.33398 21.9434 7.02299C21.932 5.71201 21.4061 4.45795 20.479 3.53087C19.552 2.6038 18.2979 2.07799 16.9869 2.06663C15.676 2.05527 14.4129 2.55922 13.47 3.47L11.75 5.18" stroke="url(#linkGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 11C13.5705 10.4259 13.0226 9.95083 12.3934 9.60707C11.7643 9.26331 11.0685 9.05889 10.3533 9.00768C9.63821 8.95648 8.92041 9.05964 8.24866 9.31023C7.5769 9.56082 6.96689 9.95297 6.46 10.46L3.46 13.46C2.54921 14.403 2.04527 15.666 2.05663 16.977C2.06799 18.288 2.5938 19.5421 3.52088 20.4691C4.44795 21.3962 5.70201 21.922 7.013 21.9334C8.32398 21.9447 9.58699 21.4408 10.53 20.53L12.24 18.82" stroke="url(#linkGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Check/Success Icon
export const CheckIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#checkGradient)"/>
    <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Gold Medal Icon
export const GoldMedalIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF3C7" />
        <stop offset="50%" stopColor="#FCD34D" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
    <path d="M9 2L7 7H17L15 2H9Z" fill="#EF4444" opacity="0.8"/>
    <circle cx="12" cy="14" r="7" fill="url(#goldGradient)"/>
    <circle cx="12" cy="14" r="5" fill="none" stroke="#FEF3C7" strokeWidth="1"/>
    <text x="12" y="17" textAnchor="middle" fill="#92400E" fontSize="8" fontWeight="bold">1</text>
  </svg>
);

// Silver Medal Icon
export const SilverMedalIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F8FAFC" />
        <stop offset="50%" stopColor="#CBD5E1" />
        <stop offset="100%" stopColor="#94A3B8" />
      </linearGradient>
    </defs>
    <path d="M9 2L7 7H17L15 2H9Z" fill="#3B82F6" opacity="0.8"/>
    <circle cx="12" cy="14" r="7" fill="url(#silverGradient)"/>
    <circle cx="12" cy="14" r="5" fill="none" stroke="#F8FAFC" strokeWidth="1"/>
    <text x="12" y="17" textAnchor="middle" fill="#475569" fontSize="8" fontWeight="bold">2</text>
  </svg>
);

// Bronze Medal Icon
export const BronzeMedalIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="bronzeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FED7AA" />
        <stop offset="50%" stopColor="#FB923C" />
        <stop offset="100%" stopColor="#C2410C" />
      </linearGradient>
    </defs>
    <path d="M9 2L7 7H17L15 2H9Z" fill="#22C55E" opacity="0.8"/>
    <circle cx="12" cy="14" r="7" fill="url(#bronzeGradient)"/>
    <circle cx="12" cy="14" r="5" fill="none" stroke="#FED7AA" strokeWidth="1"/>
    <text x="12" y="17" textAnchor="middle" fill="#7C2D12" fontSize="8" fontWeight="bold">3</text>
  </svg>
);

// Search Icon
export const SearchIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="searchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="100%" stopColor="#0EA5E9" />
      </linearGradient>
    </defs>
    <circle cx="10" cy="10" r="7" fill="none" stroke="url(#searchGradient)" strokeWidth="2"/>
    <path d="M15 15L21 21" stroke="url(#searchGradient)" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="10" cy="10" r="3" fill="#22D3EE" opacity="0.3"/>
  </svg>
);

// Users/People Icon
export const UsersIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="usersGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="100%" stopColor="#0EA5E9" />
      </linearGradient>
    </defs>
    <circle cx="9" cy="7" r="4" fill="url(#usersGradient)"/>
    <path d="M3 21V19C3 16.7909 4.79086 15 7 15H11C13.2091 15 15 16.7909 15 19V21" fill="url(#usersGradient)" opacity="0.7"/>
    <circle cx="17" cy="7" r="3" fill="#22D3EE" opacity="0.6"/>
    <path d="M17 15C19.2091 15 21 16.7909 21 19V21" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
  </svg>
);

// Clipboard/Copy Icon
export const ClipboardIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="clipboardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="100%" stopColor="#0EA5E9" />
      </linearGradient>
    </defs>
    <rect x="6" y="4" width="12" height="16" rx="2" fill="url(#clipboardGradient)" opacity="0.8"/>
    <rect x="8" y="2" width="8" height="4" rx="1" fill="#22D3EE"/>
    <path d="M9 10H15" stroke="#0C4A6E" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 14H13" stroke="#0C4A6E" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Share Icon
export const ShareIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="shareGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="100%" stopColor="#0EA5E9" />
      </linearGradient>
    </defs>
    <circle cx="18" cy="5" r="3" fill="url(#shareGradient)"/>
    <circle cx="6" cy="12" r="3" fill="url(#shareGradient)"/>
    <circle cx="18" cy="19" r="3" fill="url(#shareGradient)"/>
    <path d="M8.5 10.5L15.5 6.5" stroke="#22D3EE" strokeWidth="2"/>
    <path d="M8.5 13.5L15.5 17.5" stroke="#22D3EE" strokeWidth="2"/>
  </svg>
);

// Sticker/Art Icon
export const StickerIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="stickerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A78BFA" />
        <stop offset="100%" stopColor="#7C3AED" />
      </linearGradient>
    </defs>
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C12.76 22 13.5 21.9 14.2 21.74L21.74 14.2C21.9 13.5 22 12.76 22 12C22 6.48 17.52 2 12 2Z" fill="url(#stickerGradient)" opacity="0.8"/>
    <path d="M14.2 21.74C14.2 21.74 14.2 18 14.2 16C14.2 14 16 14.2 18 14.2C20 14.2 21.74 14.2 21.74 14.2" fill="#C4B5FD"/>
    <circle cx="9" cy="10" r="1.5" fill="#F0ABFC"/>
    <circle cx="15" cy="10" r="1.5" fill="#F0ABFC"/>
    <path d="M9 14C9 14 10.5 16 12 16C13.5 16 15 14 15 14" stroke="#F0ABFC" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Snowflake Icon (already exists but adding here for completeness)
export const SnowflakeIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2V22M12 2L8 6M12 2L16 6M12 22L8 18M12 22L16 18M2 12H22M2 12L6 8M2 12L6 16M22 12L18 8M22 12L18 16M5.64 5.64L18.36 18.36M5.64 5.64L7.05 10.1M5.64 5.64L10.1 7.05M18.36 18.36L16.95 13.9M18.36 18.36L13.9 16.95M18.36 5.64L5.64 18.36M18.36 5.64L13.9 7.05M18.36 5.64L16.95 10.1M5.64 18.36L7.05 13.9M5.64 18.36L10.1 16.95"/>
  </svg>
);

// Ice Crystal Icon
export const IceCrystalIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L9 5H6L5 9L2 12L5 15L6 19H9L12 22L15 19H18L19 15L22 12L19 9L18 5H15L12 2ZM12 6L14 8H16L17 10L19 12L17 14L16 16H14L12 18L10 16H8L7 14L5 12L7 10L8 8H10L12 6Z"/>
  </svg>
);
