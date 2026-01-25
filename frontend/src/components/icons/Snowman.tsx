interface SnowmanProps {
  className?: string;
  size?: number;
}

export default function Snowman({ className = '', size = 32 }: SnowmanProps) {
  return (
    <img
      src="/images/snowman.png"
      alt="Profile"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
