import React from 'react';

interface HelicopterIconProps {
  className?: string;
}

export const HelicopterIcon: React.FC<HelicopterIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Main rotor blade */}
    <path
      d="M2 4L12 5L22 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Rotor mast */}
    <path
      d="M12 5L12 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Fuselage */}
    <path
      d="M4 12L7 8L16 8L18 12L4 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Windshield */}
    <path
      d="M7 8L5 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Tail boom */}
    <path
      d="M16 10L22 10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Tail rotor */}
    <path
      d="M22 7L22 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Landing skid left */}
    <path
      d="M6 12L5 15L3 15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Landing skid right */}
    <path
      d="M14 12L15 15L17 15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Skid bar */}
    <path
      d="M3 15L17 15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
