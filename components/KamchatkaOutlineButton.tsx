import React from 'react'
import Image from 'next/image'

export type KamchatkaOutlineButtonProps = {
  onClick?: () => void
  className?: string
  title?: string
}

export default function KamchatkaOutlineButton({ onClick, className = '', title = 'Камчатка' }: KamchatkaOutlineButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      className={[
        'relative w-full rounded-2xl overflow-hidden border border-white/10 bg-black',
        'grid place-items-center shadow-[0_0_40px_rgba(230,193,73,0.25)] hover:shadow-[0_0_60px_rgba(230,193,73,0.35)]',
        'transition focus:outline-none focus:ring-2 focus:ring-[#E6C149] focus:ring-offset-2 focus:ring-offset-black',
        className,
      ].join(' ')}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_600px_at_20%_80%,rgba(230,193,73,0.18),transparent_60%),radial-gradient(800px_500px_at_80%_20%,rgba(162,210,255,0.12),transparent_60%)] opacity-80" />
      <div className="relative w-[78%] sm:w-[84%] rounded-2xl p-4 bg-[linear-gradient(135deg,#E6C149,#A2D2FF)] shadow-[0_8px_24px_rgba(230,193,73,0.25)] grid place-items-center">
        <Image src="/graphics/kamchatka-button.svg" alt={title} width={200} height={60} className="w-full h-auto" />
      </div>
    </button>
  )
}