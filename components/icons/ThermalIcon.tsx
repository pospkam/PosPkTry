import React from 'react';

interface ThermalIconProps {
  className?: string;
}

export const ThermalIcon: React.FC<ThermalIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Steam waves */}
    <path
      d="M8 10C8 10 8.5 8 8 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M12 10C12 10 12.5 7.5 12 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M16 10C16 10 16.5 8 16 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Pool/basin */}
    <path
      d="M4 14C4 14 5 11 12 11C19 11 20 14 20 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Water waves */}
    <path
      d="M4 17C4 17 6 15.5 8 17C10 18.5 12 17 12 17C12 17 14 15.5 16 17C18 18.5 20 17 20 17"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M4 20C4 20 6 18.5 8 20C10 21.5 12 20 12 20C12 20 14 18.5 16 20C18 21.5 20 20 20 20"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
    <path
      d="M12 10V14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M12 18V22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="16" r="2" stroke="currentColor" strokeWidth="2" />
    <path
      d="M8 4L16 4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M8 20L16 20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);