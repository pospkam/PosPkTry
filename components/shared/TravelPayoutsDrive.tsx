'use client';

import Script from 'next/script';

/**
 * TP Drive — AI-монетизация контента от Travelpayouts.
 * ID площадки: 513488 (tourhab.ru)
 * Автоматически заменяет ссылки на трекинговые, показывает превью
 * и открывает таргетированные предложения.
 * Docs: https://support.travelpayouts.com/hc/ru/sections/200989057
 */
export default function TravelPayoutsDrive() {
  return (
    <Script id="tp-drive" strategy="afterInteractive">
      {`(function(){var s=document.createElement("script");s.async=1;s.src="https://emrldco.com/NTEzNDg4.js?t=513488";document.head.appendChild(s);})();`}
    </Script>
  );
}
