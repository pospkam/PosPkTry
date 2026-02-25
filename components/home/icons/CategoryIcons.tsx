/**
 * CategoryIcons — минималистичные SVG-иконки для чипов категорий.
 *
 * Все иконки в едином стиле: outline, strokeWidth=1.5, currentColor.
 * Размер внутреннего viewBox: 24×24.
 * Цвет задаётся через color родителя (наследуется через currentColor).
 */

interface IconProps {
  /** Размер иконки в пикселях (по умолчанию 32) */
  size?: number;
}

/** Вулкан — outline горного пика с кратером */
export function Mountain({ size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Основной силуэт горы */}
      <path d="M3 20L9 8l3 5 2-3 7 10H3z" />
      {/* Кратер вулкана (стилизованный пик) */}
      <path d="M9 8C9 5.5 10.5 4 12 4s3 1.5 3 4" opacity={0.6} />
      {/* Лавовые потоки */}
      <path d="M11 4.5L10.5 3M12.5 4L13 3" strokeWidth={1} opacity={0.5} />
    </svg>
  );
}

/** Рыбалка — рыба в воде */
export function Fish({ size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Тело рыбы */}
      <path d="M6.5 12C6.5 8 10 5 14 7.5C16.5 9 18 11 18 12C18 13 16.5 15 14 16.5C10 19 6.5 16 6.5 12Z" />
      {/* Хвостовой плавник */}
      <path d="M6.5 12L3.5 9.5M6.5 12L3.5 14.5" />
      {/* Глаз рыбы */}
      <circle cx="14.5" cy="11" r="0.8" fill="currentColor" stroke="none" />
      {/* Волны воды */}
      <path d="M4 19.5C5.5 18 7.5 18 9 19.5C10.5 21 12.5 21 14 19.5" opacity={0.5} />
    </svg>
  );
}

/** Термальные источники — волны с паром */
export function Waves({ size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Пар над источником */}
      <path d="M8 4C8 4 8.5 5.5 8 7C7.5 8.5 8 10 8 10" opacity={0.6} />
      <path d="M12 3C12 3 12.5 5 12 7C11.5 9 12 11 12 11" opacity={0.6} />
      <path d="M16 4C16 4 16.5 5.5 16 7C15.5 8.5 16 10 16 10" opacity={0.6} />
      {/* Поверхность воды — волны */}
      <path d="M3 14C4.5 12.5 6.5 12.5 8 14C9.5 15.5 11.5 15.5 13 14C14.5 12.5 16.5 12.5 18 14C19.5 15.5 21 15 21 15" />
      <path d="M3 18C4.5 16.5 6.5 16.5 8 18C9.5 19.5 11.5 19.5 13 18C14.5 16.5 16.5 16.5 18 18C19.5 19.5 21 19 21 19" />
    </svg>
  );
}

/** Вертолёт — вид сбоку */
export function Helicopter({ size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Фюзеляж */}
      <path d="M4 13C4 13 4 11 7 11H16C18.5 11 19.5 12.5 19.5 13.5C19.5 14.5 18.5 16 16 16H9L6 18H4V13Z" />
      {/* Хвостовая балка */}
      <path d="M16 16L20 14" />
      {/* Хвостовой ротор */}
      <path d="M20 12V16" />
      {/* Несущий ротор */}
      <path d="M3 9H14" />
      <path d="M8.5 9V7" />
      {/* Лыжи шасси */}
      <path d="M7 18H11M14 18H17" />
      <path d="M8 16.5V18M16 16V18" />
    </svg>
  );
}

/** Пеший туризм — силуэт человека с рюкзаком */
export function Footprints({ size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Голова */}
      <circle cx="12" cy="4" r="2" />
      {/* Тело с рюкзаком */}
      <path d="M12 6L11 13H13L12 6Z" />
      {/* Рюкзак */}
      <rect x="13" y="7" width="3.5" height="4" rx="1" />
      {/* Ноги — шаг */}
      <path d="M11 13L9 19" />
      <path d="M13 13L14 19" />
      {/* Ступни */}
      <path d="M7.5 19H10.5" />
      <path d="M13.5 19H16" />
      {/* Трекинговая палка */}
      <path d="M8 8L6 18" strokeWidth={1.2} />
    </svg>
  );
}

/** Лодка — катер на воде */
export function Boat({ size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Корпус лодки */}
      <path d="M4 15L5 18H19L20 15H4Z" />
      {/* Борта лодки */}
      <path d="M6 15V12H18V15" />
      {/* Мачта */}
      <path d="M12 12V6" />
      {/* Парус */}
      <path d="M12 6L17 12H12" />
      {/* Волны */}
      <path d="M2 20C3.5 18.5 5 18.5 6.5 20C8 21.5 9.5 21.5 11 20C12.5 18.5 14 18.5 15.5 20C17 21.5 18.5 21.5 20 20" opacity={0.5} />
    </svg>
  );
}
