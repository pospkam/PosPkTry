import { Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle } from 'lucide-react';

interface WeatherIconProps {
  condition: string;
  className?: string;
}

export const WeatherIcon = ({ condition, className = "w-5 h-5" }: WeatherIconProps) => {
  const icons: { [key: string]: JSX.Element } = {
    clear: <Sun className={className} strokeWidth={1.5} />,
    mostly_clear: <Sun className={`${className} opacity-80`} strokeWidth={1.5} />,
    partly_cloudy: <Cloud className={className} strokeWidth={1.5} />,
    overcast: <Cloud className={`${className} opacity-90`} strokeWidth={1.5} />,
    rain: <CloudRain className={className} strokeWidth={1.5} />,
    snow: <CloudSnow className={className} strokeWidth={1.5} />,
    thunderstorm: <CloudRain className={`${className} animate-pulse`} strokeWidth={1.5} />,
    fog: <CloudDrizzle className={className} strokeWidth={1.5} />,
  };
  
  return icons[condition] || <Sun className={className} strokeWidth={1.5} />;
};
