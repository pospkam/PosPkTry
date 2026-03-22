'use client';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 36, className }: LogoProps) {
  return (
    <svg
      width={size * 1.4}
      height={size}
      viewBox="0 0 56 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Kamchatour Hub"
    >
      {/* Main mountain range */}
      <polyline
        points="2,30 12,12 19,22 28,4 37,22 43,14 54,30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Ground line */}
      <line
        x1="0"
        y1="30"
        x2="56"
        y2="30"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.3"
      />
    </svg>
  );
}
