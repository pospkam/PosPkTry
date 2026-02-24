import React from 'react';

// 1. Volcano (вулкан)
export const VolcanoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2L4 8V16L12 22L20 16V8L12 2Z M12 4L18 9V15L12 20L6 15V9L12 4Z M10 10L14 14" />
    <path d="M12 16V20" />
  </svg>
);

// 2. Bear (медведь стоящий)
export const BearIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 4C9.79 4 8 5.79 8 8C8 9.5 8.8 10.8 10 11.5V15H14V11.5C15.2 10.8 16 9.5 16 8C16 5.79 14.21 4 12 4Z" />
    <path d="M7 18C7 16.9 7.9 16 9 16H15C16.1 16 17 16.9 17 18V20H7V18Z" />
    <path d="M10 8H14" />
  </svg>
);

// 3. Fishing Rod (удочка)
export const FishIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 21L21 3" />
    <path d="M21 3L18 12L15 15L6 21" />
    <path d="M12 12L9 15" />
  </svg>
);

// 4. Hot Spring Steam (пар от горячего источника)
export const HotSpringIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 4C8 4 5 7 5 11C5 15 8 18 12 18C16 18 19 15 19 11C19 7 16 4 12 4Z" />
    <path d="M12 18V21" />
    <path d="M8 14C8 14 10 16 12 14C14 12 16 14 16 14" />
  </svg>
);

// 5. Hiking Boot (треккинговый ботинок)
export const HikerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 20H20V18L18 12L16 8L14 4H10L8 8L6 12L4 18V20Z" />
    <path d="M10 4V8" />
    <path d="M8 12H16" />
  </svg>
);

// 6. Helicopter (вертолёт)
export const HelicopterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 4V2" />
    <path d="M4 12H20" />
    <path d="M6 16L4 18" />
    <path d="M18 16L20 18" />
    <path d="M12 6C8 6 5 9 5 13C5 17 8 20 12 20C16 20 19 17 19 13C19 9 16 6 12 6Z" />
  </svg>
);

// 7. Raft (рафт / надувная лодка)
export const RaftingIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 12C3 10 5 8 7 8H17C19 8 21 10 21 12V16C21 18 19 20 17 20H7C5 20 3 18 3 16V12Z" />
    <path d="M12 8V20" />
    <path d="M7 12H17" />
  </svg>
);

// 8. Ethno Drum (этнический барабан / шаманский бубен)
export const EthnoDrumIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 4C8 4 5 7 5 11V13C5 17 8 20 12 20C16 20 19 17 19 13V11C19 7 16 4 12 4Z" />
    <path d="M12 4V2" />
    <path d="M8 8H16" />
    <path d="M9 16H15" />
    <path d="M12 11V15" />
  </svg>
);

// Legacy alias для обратной совместимости
export const TwoHikersIcon = HotSpringIcon;
