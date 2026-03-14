import { ThemeProvider } from '@/contexts/ThemeContext';

export default function FishingKamLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
