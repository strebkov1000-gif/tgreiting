interface PrizeProps {
  className?: string;
  size?: number;
}

export default function Prize({ className = '', size = 32 }: PrizeProps) {
  return (
    <img
      src="/images/prize.png"
      alt="Prizes"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
