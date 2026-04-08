import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';

export const metadata = {
  title: 'Условия комиссионного вознаграждения | Tourhab',
  description: 'Подробные условия комиссии платформы Tourhab для партнёров',
};

export default function CommissionPage() {
  return (
    <PageShell title="Комиссии">
    <main className="bg-transparent text-[var(--text-primary)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-[var(--accent)] hover:text-[var(--accent)]/80 mb-8">
          <ChevronLeft className="w-5 h-5 mr-1" />
          На главную
        </Link>

        <h1 className="text-3xl font-bold mb-8">Условия комиссионного вознаграждения</h1>

        <div className="prose prose-invert max-w-none space-y-6 text-[var(--text-secondary)]">
          <p className="text-sm text-[var(--text-muted)]">Действует с 1 апреля 2026 г. Является неотъемлемой частью{' '}
            <Link href="/legal/offer" className="text-[var(--ocean)] hover:underline">Публичной оферты</Link>.
          </p>

          <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-xl p-6 my-8">
            <h2 className="text-2xl font-bold text-[var(--accent)] mb-3">Итоговое удержание: 18%</h2>
            <div className="space-y-1 text-sm">
              <p>— Комиссия Платформы: <strong>15%</strong></p>
              <p>— Обработка платежей (CloudPayments): <strong>3%</strong></p>
              <p className="mt-3 text-[var(--text-primary)] font-semibold">Партнёр получает: 82% от суммы бронирования</p>
            </div>
          </div>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">Что включено в комиссию Платформы (15%)</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-[var(--bg-card)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Размещение и SEO</h3>
                <p className="text-sm">Публикация услуг с SEO-оптимизацией в Яндекс и Google</p>
              </div>
              <div className="bg-[var(--bg-card)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">CRM и бронирования</h3>
                <p className="text-sm">Личный кабинет, управление бронированиями, уведомления</p>
              </div>
              <div className="bg-[var(--bg-card)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Маркетинг</h3>
                <p className="text-sm">Продвижение в социальных сетях, партнёрских каналах и рассылках</p>
              </div>
              <div className="bg-[var(--bg-card)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">AI-ассистент Кузьмич</h3>
                <p className="text-sm">Интеллектуальные рекомендации туров пользователям платформы</p>
              </div>
              <div className="bg-[var(--bg-card)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Аналитика</h3>
                <p className="text-sm">Финансовые отчёты, статистика бронирований, сравнение с рынком</p>
              </div>
              <div className="bg-[var(--bg-card)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Поддержка</h3>
                <p className="text-sm">Техническая поддержка партнёра и сопровождение клиентов</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">Пример расчёта</h2>
            <div className="bg-[var(--bg-card)] rounded-xl p-6">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3">Стоимость тура (оплата клиентом)</td>
                    <td className="py-3 text-right font-semibold">25 000 ₽</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 text-[var(--text-muted)]">Комиссия Платформы (15%)</td>
                    <td className="py-3 text-right" style={{ color: 'var(--danger)' }}>−3 750 ₽</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 text-[var(--text-muted)]">Эквайринг CloudPayments (3%)</td>
                    <td className="py-3 text-right" style={{ color: 'var(--danger)' }}>−750 ₽</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3 text-[var(--text-muted)]">Итого удержано (18%)</td>
                    <td className="py-3 text-right text-sm" style={{ color: 'var(--danger)' }}>−4 500 ₽</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold text-[var(--text-primary)]">Партнёр получает (82%)</td>
                    <td className="py-3 text-right font-bold text-lg" style={{ color: 'var(--success)' }}>20 500 ₽</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">Порядок выплат</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Выплаты производятся на расчётный счёт, указанный при регистрации</li>
              <li>Срок выплаты — не более 3 рабочих дней после подтверждения факта оказания услуги</li>
              <li>Минимальная сумма единовременной выплаты — 1 000 ₽; при меньшем остатке средства
                  накапливаются до следующего цикла</li>
              <li>Выплаты осуществляются в рабочие дни (пн–пт, кроме праздников)</li>
              <li>После каждой выплаты Партнёру направляется акт выполненных работ на электронную почту</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">Особые условия</h2>

            <h3 className="font-semibold text-[var(--text-primary)] mt-4 mb-2">Отмена по инициативе клиента</h3>
            <p>
              Возврат производится согласно политике отмены, установленной Партнёром для конкретной услуги.
              Комиссия Платформы с возвращённой суммы не удерживается.
            </p>

            <h3 className="font-semibold text-[var(--text-primary)] mt-4 mb-2">Отмена по инициативе Партнёра</h3>
            <p>
              При отмене подтверждённого бронирования по инициативе Партнёра клиенту возвращается 100%
              стоимости. Комиссия в этом случае не взимается. Систематические отмены (более 10% бронирований
              за квартал) влекут снижение рейтинга и могут служить основанием для ограничения функционала
              аккаунта.
            </p>

            <h3 className="font-semibold text-[var(--text-primary)] mt-4 mb-2">Форс-мажор</h3>
            <p>
              При отмене тура вследствие обстоятельств непреодолимой силы (стихийные бедствия,
              запрет прохода в зону, предписание МЧС) Партнёр обязан уведомить Платформу незамедлительно.
              Возврат средств клиентам производится в полном объёме. Комиссия не взимается.
            </p>

            <h3 className="font-semibold text-[var(--text-primary)] mt-4 mb-2">Спорные ситуации</h3>
            <p>
              При претензиях клиента к качеству услуги Платформа выступает посредником. Решение принимается
              индивидуально на основе доказательств сторон. Платформа вправе удержать спорную сумму до
              разрешения спора, но не более 30 рабочих дней.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibred text-[var(--text-primary)] mt-8 mb-4">Налогообложение</h2>
            <p>
              Партнёр самостоятельно исчисляет и уплачивает налоги с полученного дохода в соответствии
              с применяемой им системой налогообложения (ОСНО, УСН, ПСН и др.).
            </p>
            <p>
              Платформа предоставляет Партнёрам—плательщикам НДС счета-фактуры и акты выполненных работ
              по запросу в течение 5 рабочих дней. Для ОСНО комиссия Платформы учитывается как расход
              по агентскому вознаграждению.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">Контакты по финансовым вопросам</h2>
            <p className="font-mono text-sm leading-7">
              ООО «ПОС-СЕРВИС», ИНН 4101147649, ОГРН 1114101005952<br />
              683024, Камчатский край, г. Петропавловск-Камчатский<br />
              Генеральный директор: Асеев Андрей Валерьевич<br />
              Финансовые вопросы: <a href="mailto:finance@tourhab.ru" className="text-[var(--ocean)] hover:underline">finance@tourhab.ru</a><br />
              Вопросы сотрудничества: <a href="mailto:partners@tourhab.ru" className="text-[var(--ocean)] hover:underline">partners@tourhab.ru</a>
            </p>
          </section>
        </div>
      </div>
    </main>
    </PageShell>
  );
}
