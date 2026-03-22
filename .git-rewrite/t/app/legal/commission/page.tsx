import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';

export const metadata = {
  title: 'Условия комиссионного вознаграждения | KamHub',
  description: 'Подробные условия комиссии платформы KamHub для партнеров',
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
          <p className="text-sm text-[var(--text-muted)]">Действует с 1 января 2025 г.</p>

          <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-xl p-6 my-8">
            <h2 className="text-2xl font-bold text-[var(--accent)] mb-2">Комиссия: 10%</h2>
            <p className="text-[var(--text-secondary)]">
              Единая ставка комиссии для всех категорий услуг и всех партнеров.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">Что включено в комиссию</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-[var(--bg-card)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Размещение</h3>
                <p className="text-sm">Публикация ваших услуг на платформе с SEO-оптимизацией</p>
              </div>
              <div className="bg-[var(--bg-card)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Платежи</h3>
                <p className="text-sm">Прием онлайн-платежей от клиентов (карты, СБП)</p>
              </div>
              <div className="bg-[var(--bg-card)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">CRM</h3>
                <p className="text-sm">Личный кабинет с управлением бронированиями</p>
              </div>
              <div className="bg-[var(--bg-card)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Поддержка</h3>
                <p className="text-sm">Техническая поддержка и помощь клиентам</p>
              </div>
              <div className="bg-[var(--bg-card)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Маркетинг</h3>
                <p className="text-sm">Продвижение в поисковых системах и соцсетях</p>
              </div>
              <div className="bg-[var(--bg-card)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Аналитика</h3>
                <p className="text-sm">Статистика бронирований и финансовые отчеты</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">Пример расчета</h2>
            <div className="bg-[var(--bg-card)] rounded-xl p-6">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3">Стоимость тура</td>
                    <td className="py-3 text-right font-semibold">25 000 ₽</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-3">Комиссия платформы (10%)</td>
                    <td className="py-3 text-right text-red-400">- 2 500 ₽</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold text-[var(--text-primary)]">Вы получаете</td>
                    <td className="py-3 text-right font-bold text-green-400 text-lg">22 500 ₽</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">Порядок выплат</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Выплаты производятся на расчетный счет, указанный при регистрации</li>
              <li>Срок выплаты — 3 рабочих дня после оказания услуги</li>
              <li>Минимальная сумма выплаты — 1 000 ₽</li>
              <li>При сумме менее 1 000 ₽ — накопление до следующей выплаты</li>
              <li>Выплаты производятся по будням</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">Особые условия</h2>
            
            <h3 className="font-semibold text-[var(--text-primary)] mt-4 mb-2">Отмена бронирования клиентом</h3>
            <p>
              При отмене бронирования клиентом возврат производится согласно вашей политике отмены. 
              Комиссия с возвращенной суммы не удерживается.
            </p>

            <h3 className="font-semibold text-[var(--text-primary)] mt-4 mb-2">Отмена бронирования партнером</h3>
            <p>
              При отмене по вашей инициативе клиенту возвращается 100% стоимости. 
              Комиссия в этом случае не взимается, но систематические отмены могут 
              привести к снижению рейтинга.
            </p>

            <h3 className="font-semibold text-[var(--text-primary)] mt-4 mb-2">Спорные ситуации</h3>
            <p>
              При возникновении споров с клиентами решение принимается индивидуально. 
              Платформа выступает посредником в разрешении конфликтов.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">Налогообложение</h2>
            <p>
              Партнер самостоятельно уплачивает налоги с полученного дохода в соответствии 
              с применяемой системой налогообложения.
            </p>
            <p>
              Платформа предоставляет акты выполненных работ и счета-фактуры (для плательщиков НДС).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">Вопросы</h2>
            <p>
              По вопросам комиссии и выплат обращайтесь:<br />
              Email: finance@kamhub.ru<br />
              ООО «Трей» (ИНН 4100053571)<br />
              683017, Камчатский край, г. Петропавловск-Камчатский, ул. Дзержинского, д. 2а, кв. 22
            </p>
          </section>
        </div>
      </div>
    </main>
    </PageShell>
  );
}
