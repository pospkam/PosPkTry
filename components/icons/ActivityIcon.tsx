import { Mountain, Eye, TreePine, Fish, CloudSnow, Waves } from 'lucide-react';

interface ActivityIconProps {
  activity: string;
  className?: string;
}

export const ActivityIcon = ({ activity, className = "w-5 h-5" }: ActivityIconProps) => {
  const icons: { [key: string]: JSX.Element } = {
    hiking: <Mountain className={className} strokeWidth={1.5} />,
    sightseeing: <Eye className={className} strokeWidth={1.5} />,
    wildlife: <TreePine className={className} strokeWidth={1.5} />,
    fishing: <Fish className={className} strokeWidth={1.5} />,
    skiing: <CloudSnow className={className} strokeWidth={1.5} />,
    diving: <Waves className={className} strokeWidth={1.5} />,
  };
  
  return icons[activity] || <Mountain className={className} strokeWidth={1.5} />;
};
