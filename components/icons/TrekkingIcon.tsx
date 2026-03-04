import React from 'react';

interface TrekkingIconProps {
  className?: string;
}

export const TrekkingIcon: React.FC<TrekkingIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Head */}
    <circle
      cx="10"
      cy="4"
      r="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Backpack */}
    <path
      d="M8 8L8 14L11 14L11 8Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Body / torso */}
    <path
      d="M10 6L10 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Front leg (walking) */}
    <path
      d="M10 14L13 18L14 22"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Back leg (walking) */}
    <path
      d="M10 14L7 18L6 22"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Trekking pole */}
    <path
      d="M13 7L16 20"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Arm holding pole */}
    <path
      d="M10 9L13 7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Mountain in background */}
    <path
      d="M17 22L20 14L23 22"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
