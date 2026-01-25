interface SnowMountainProps {
  className?: string;
  size?: number;
}

export default function SnowMountain({ className = '', size = 32 }: SnowMountainProps) {
  return (
    <img
      src="/images/mountain.png"
      alt="Mountain"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
