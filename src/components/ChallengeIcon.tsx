interface ChallengeIconProps {
  size?: number;
  className?: string;
}

/** The Challenge artwork, used wherever a challenge is referenced. */
export default function ChallengeIcon({ size = 14, className = '' }: ChallengeIconProps) {
  return (
    <img
      src="/img/ui/Challenge%20Icon.png"
      alt=""
      draggable={false}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
