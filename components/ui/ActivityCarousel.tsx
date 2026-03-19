'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

// -- Types --

interface ActivityItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface ActivityCarouselProps {
  activities: ActivityItem[];
  onActivityClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
  clickedActivity: string | null;
}

/**
 * Вспомогательная функция для ripple-эффекта (клик по карточке)
 * @param {React.MouseEvent<HTMLElement>} e - Событие клика
 * @param {HTMLElement} container - Контейнер для ripple
 * @param {string} color - Цвет ripple
 */
function spawnRipple(
  e: React.MouseEvent<HTMLElement>,
  container: HTMLElement,
  color = 'var(--accent)'
): void {
  const rect = container.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  const ripple = document.createElement('span');
  ripple.style.cssText = `
    position:absolute;border-radius:50%;
    width:${size}px;height:${size}px;
    left:${x}px;top:${y}px;
    background:${color};
    transform:scale(0);
    animation:kh-ripple 600ms linear forwards;
    pointer-events:none;
  `;
  container.style.overflow = 'hidden';
  container.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);
}

// -- Constants --

const CARD_WIDTH = 100;
const CARD_GAP = 12;
const ITEM_TOTAL = CARD_WIDTH + CARD_GAP; // 112px per item slot
const PAUSE_DURATION = 2000; // 2s pause on centered item
const SCROLL_SPEED = 0.5; // px per frame (smooth)

// -- Component --

/**
 * Карусель активностей для главной/каталога (ripple, accessibility)
 * @param {ActivityCarouselProps} props
 * @returns {JSX.Element}
 * @remarks
 * - Использует ripple-эффект, auto-scroll
 * - Производительность: оптимизировано для 60fps
 * - Accessibility: каждая карточка снабжена aria-label, поддерживает клавиатуру
 */
export default function ActivityCarousel({
  activities,
  onActivityClick,
  clickedActivity,
}: ActivityCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const scrollPosRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollStartRef = useRef(0);
  const [centerIndex, setCenterIndex] = useState(0);

  // Triple the items for seamless looping
  const tripled = [...activities, ...activities, ...activities];
  const totalItems = activities.length;
  const singleSetWidth = totalItems * ITEM_TOTAL;

  // Calculate which item is centered
  const getCenterItemIndex = useCallback(
    (scrollLeft: number, containerWidth: number): number => {
      const center = scrollLeft + containerWidth / 2;
      const idx = Math.round(center / ITEM_TOTAL) % totalItems;
      return ((idx % totalItems) + totalItems) % totalItems;
    },
    [totalItems]
  );

  // Auto-scroll animation loop
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Initialize scroll to the middle set
    scrollPosRef.current = singleSetWidth;
    track.scrollLeft = singleSetWidth;

    let lastTime = performance.now();

    const animate = (now: number) => {
      if (isDraggingRef.current) {
        lastTime = now;
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // During pause, don't scroll
      if (now < pauseUntilRef.current) {
        lastTime = now;
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const delta = now - lastTime;
      lastTime = now;

      const advance = SCROLL_SPEED * (delta / 16.667); // normalize to 60fps
      scrollPosRef.current += advance;

      // Seamless loop: if scrolled past two sets, wrap back
      if (scrollPosRef.current >= singleSetWidth * 2) {
        scrollPosRef.current -= singleSetWidth;
      }

      track.scrollLeft = scrollPosRef.current;

      // Check if we reached a snap point (center of an item)
      const containerWidth = track.clientWidth;
      const centerOffset = scrollPosRef.current + containerWidth / 2;
      const nearestItemCenter =
        Math.round(centerOffset / ITEM_TOTAL) * ITEM_TOTAL;
      const distToSnap = Math.abs(centerOffset - nearestItemCenter);

      // If close to a snap point, pause briefly
      if (distToSnap < 1.5 && now >= pauseUntilRef.current) {
        pauseUntilRef.current = now + PAUSE_DURATION;
        const idx = getCenterItemIndex(scrollPosRef.current, containerWidth);
        setCenterIndex(idx);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    // Initial center index
    const initialIdx = getCenterItemIndex(
      singleSetWidth,
      track.clientWidth
    );
    setCenterIndex(initialIdx);

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [singleSetWidth, getCenterItemIndex]);

  // Touch / pointer drag support
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragScrollStartRef.current = scrollPosRef.current;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const diff = dragStartXRef.current - e.clientX;
    scrollPosRef.current = dragScrollStartRef.current + diff;

    if (trackRef.current) {
      // Wrap if needed
      if (scrollPosRef.current >= singleSetWidth * 2) {
        scrollPosRef.current -= singleSetWidth;
        dragScrollStartRef.current -= singleSetWidth;
      } else if (scrollPosRef.current < 0) {
        scrollPosRef.current += singleSetWidth;
        dragScrollStartRef.current += singleSetWidth;
      }
      trackRef.current.scrollLeft = scrollPosRef.current;
    }
  }, [singleSetWidth]);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    // Update center index after drag
    if (trackRef.current) {
      const idx = getCenterItemIndex(
        scrollPosRef.current,
        trackRef.current.clientWidth
      );
      setCenterIndex(idx);
      // Small pause after manual interaction
      pauseUntilRef.current = performance.now() + PAUSE_DURATION;
    }
  }, [getCenterItemIndex]);

  return (
    <div
      style={{
        width: '100%',
        overflow: 'hidden',
        touchAction: 'pan-y',
        paddingTop: '12px',
        paddingBottom: '12px',
      }}
    >
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="activity-carousel-track"
        style={{
          display: 'flex',
          gap: `${CARD_GAP}px`,
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          cursor: isDraggingRef.current ? 'grabbing' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {tripled.map((activity, i) => {
          const realIndex = i % totalItems;
          const isCentered = realIndex === centerIndex;
          const isClicked = clickedActivity === activity.href;

          return (
            <a
              key={`${activity.href}-${i}`}
              href={activity.href}
              onClick={(e) => {
                const target = e.currentTarget;
                spawnRipple(e, target);
                onActivityClick(e, activity.href);
              }}
              aria-label={activity.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: `${CARD_WIDTH}px`,
                minWidth: `${CARD_WIDTH}px`,
                padding: '12px 8px',
                background: 'var(--bg-card)',
                border: isCentered
                  ? '1px solid var(--accent)'
                  : isClicked
                    ? '1px solid var(--accent)'
                    : '1px solid var(--border)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
                transition: 'transform 300ms ease, opacity 300ms ease, border-color 300ms ease, box-shadow 300ms ease',
                transform: isCentered
                  ? 'scale(1.2) translateY(-8px)'
                  : 'scale(0.9)',
                opacity: isCentered ? 1 : 0.7,
                boxShadow: isCentered
                  ? 'var(--shadow-md)'
                  : 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {activity.icon}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  fontSize: '12px',
                  fontWeight: 500,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  marginTop: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {activity.label}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
