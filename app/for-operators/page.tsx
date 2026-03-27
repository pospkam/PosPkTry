import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { OperatorPromo } from '@/components/homepage/OperatorPromo'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Для туроператоров — Kamchatour Hub',
  description: 'AI Lead Processor: квалификация заявок за 15 секунд, подбор туров, PDF-предложения, Telegram-уведомления.',
}

export default function ForOperatorsPage() {
  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100dvh]">
      <Header />
      <main className="pt-16">
        <OperatorPromo />
      </main>
      <Footer />
    </div>
  )
}
