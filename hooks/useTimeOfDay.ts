import { useState, useEffect } from 'react';

export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'late-evening' | 'night';

export function useTimeOfDay(): TimeOfDay {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('afternoon');

  useEffect(() => {
    const updateTimeOfDay = () => {
      const hour = new Date().getHours();
      
      if (hour >= 5 && hour < 7) {
        setTimeOfDay('dawn');
      } else if (hour >= 7 && hour < 12) {
        setTimeOfDay('morning');
      } else if (hour >= 12 && hour < 18) {
        setTimeOfDay('afternoon');
      } else if (hour >= 18 && hour < 21) {
        setTimeOfDay('evening');
      } else if (hour >= 21 && hour < 23) {
        setTimeOfDay('late-evening');
      } else {
        setTimeOfDay('night');
      }
    };

    updateTimeOfDay();
    const interval = setInterval(updateTimeOfDay, 60000); // Обновляем каждую минуту

    return () => clearInterval(interval);
  }, []);

  return timeOfDay;
}
