import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { OperatorPromo } from '@/components/homepage/OperatorPromo'
import { AgentModelSection } from '@/components/homepage/AgentModelSection'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Для туроператоров Камчатки — партнёрская программа TourHab 2026',
  description: 'Кузьмич и operator tools для туроператоров Камчатки: AI-приём обращений, квалификация лидов, подбор туров, PDF-предложения и Telegram-уведомления. Комиссия 10%. Первые 3 месяца бесплатно.',
}

export default function ForOperatorsPage() {
  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100dvh]">
      <Header />
      <main className="pt-16">
        <OperatorPromo />
        <AgentModelSection />
      </main>
      <Footer />
    </div>
  )
}
