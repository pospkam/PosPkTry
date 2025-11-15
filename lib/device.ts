/**
 * Утилиты для определения типа устройства
 */

// Определение мобильного устройства на клиенте
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Определение планшета
export function isTablet(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isTabletUA = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent);
  
  return isTabletUA;
}

// Определение десктопа
export function isDesktop(): boolean {
  return !isMobileDevice() && !isTablet();
}

// Получение типа устройства
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function getDeviceType(): DeviceType {
  if (isMobileDevice()) return 'mobile';
  if (isTablet()) return 'tablet';
  return 'desktop';
}

// Определение размера экрана
export function getScreenSize(): 'sm' | 'md' | 'lg' | 'xl' {
  if (typeof window === 'undefined') return 'lg';
  
  const width = window.innerWidth;
  
  if (width < 640) return 'sm';
  if (width < 768) return 'md';
  if (width < 1024) return 'lg';
  return 'xl';
}

// Определение touch устройства
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
}

// React Hook для использования в компонентах
import { useState, useEffect } from 'react';

export function useDevice() {
  const [device, setDevice] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    deviceType: 'desktop' as DeviceType,
    isTouch: false,
    screenSize: 'lg' as 'sm' | 'md' | 'lg' | 'xl'
  });

  useEffect(() => {
    const updateDevice = () => {
      setDevice({
        isMobile: isMobileDevice(),
        isTablet: isTablet(),
        isDesktop: isDesktop(),
        deviceType: getDeviceType(),
        isTouch: isTouchDevice(),
        screenSize: getScreenSize()
      });
    };

    updateDevice();
    window.addEventListener('resize', updateDevice);
    
    return () => window.removeEventListener('resize', updateDevice);
  }, []);

  return device;
}
