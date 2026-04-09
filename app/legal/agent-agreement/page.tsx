import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';

export const metadata = {
  title: 'Агентский договор — TourHab',
  description: 'Шаблон агентского договора между платформой TourHab и туроператором Камчатки. Комиссия 10%, AI-обработка лидов, прозрачные условия.',
};

export default function AgentAgreementPage() {
  return (
    <PageShell title="Агентский договор">
    <main className="bg-transparent text-[var(--text-primary)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/for-operators" className="inline-flex items-center text-[var(--accent)] hover:text-[var(--accent)]/80 mb-8">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Для операторов
        </Link>

        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
          Агентский договор
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">Редакция от 9 апреля 2026 г.</p>

        <div className="prose max-w-none space-y-6 text-[var(--text-secondary)]">

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">1. Предмет договора</h2>
            <p>
              ООО &laquo;ПОС-СЕРВИС&raquo; (ОГРН 1114101005952, ИНН 4101147649), действующее под брендом
              TourHab (далее &mdash; Агент), и туроператор (далее &mdash; Принципал) заключают настоящий
              агентский договор в соответствии со ст. 1005-1011 ГК РФ,
              Федеральным законом от 24.11.1996 No 132-ФЗ &laquo;Об основах туристской деятельности
              в Российской Федерации&raquo;, Федеральным законом от 22.05.2003 No 54-ФЗ
              &laquo;О применении контрольно-кассовой техники&raquo; и Федеральным законом
              от 27.07.2006 No 152-ФЗ &laquo;О персональных данных&raquo;.
            </p>
            <p>
              Агент обязуется от своего имени, но за счёт Принципала, привлекать туристов
              для приобретения туристических услуг Принципала через платформу tourhab.ru,
              мессенджер-ботов (Telegram, MAX) и партнёрские каналы.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">2. Обязанности Агента</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Размещение информации о турах Принципала на платформе</li>
              <li>AI-обработка входящих заявок: квалификация лида, определение бюджета, дат и предпочтений</li>
              <li>Автоматический подбор подходящих туров из каталога Принципала</li>
              <li>Генерация персонального предложения (PDF) для туриста</li>
              <li>Уведомление Принципала о новых заявках в Telegram</li>
              <li>Приём платежей от туристов и перечисление средств Принципалу</li>
              <li>Маркетинговое продвижение туров через SEO, AI-ботов и партнёрские каналы</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">3. Обязанности Принципала</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Предоставлять актуальную информацию о турах (описания, фото, цены, даты)</li>
              <li>Подтверждать или отклонять заявки в течение 24 часов</li>
              <li>Оказывать туристические услуги надлежащего качества</li>
              <li>Иметь действующую страховку ответственности туроператора</li>
              <li>Нести полную ответственность перед туристом за оказание услуг</li>
              <li>Своевременно обновлять наличие мест и расписание</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">4. Агентское вознаграждение</h2>
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
              <div className="text-sm space-y-2">
                <p className="font-semibold text-[var(--text-primary)]">Тарифная сетка комиссии Агента</p>
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div className="p-2 rounded bg-[var(--bg-hover)]">
                    <p className="font-medium">Старт</p>
                    <p className="text-xl font-bold text-[var(--accent)]">15%</p>
                    <p className="text-xs text-[var(--text-muted)]">первые 3 месяца</p>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-hover)]">
                    <p className="font-medium">Базовый</p>
                    <p className="text-xl font-bold text-[var(--accent)]">10%</p>
                    <p className="text-xs text-[var(--text-muted)]">оборот от 100 000 ₽/кв</p>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-hover)]">
                    <p className="font-medium">Партнёр</p>
                    <p className="text-xl font-bold text-[var(--accent)]">7%</p>
                    <p className="text-xs text-[var(--text-muted)]">оборот от 500 000 ₽/кв</p>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-hover)]">
                    <p className="font-medium">Премиум</p>
                    <p className="text-xl font-bold text-[var(--accent)]">5%</p>
                    <p className="text-xs text-[var(--text-muted)]">оборот от 1 500 000 ₽/кв</p>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">+ 3% эквайринг (итого 8–18% в зависимости от тарифа)</p>
              </div>
            </div>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Комиссия удерживается из оплаты туриста при перечислении средств Принципалу</li>
              <li>Перечисление &mdash; в течение <strong>3 рабочих дней</strong> с момента подтверждения оказания услуги, минимальная сумма 1 000 &#8381;</li>
              <li>При отмене тура туристом &mdash; комиссия не удерживается</li>
              <li>При отмене тура Принципалом &mdash; полный возврат туристу</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">5. AI Lead Processor</h2>
            <p>
              Агент предоставляет Принципалу доступ к системе AI Lead Processor, которая:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Автоматически квалифицирует входящие заявки (бюджет, даты, предпочтения)</li>
              <li>Подбирает подходящие туры из каталога Принципала</li>
              <li>Генерирует PDF-предложение для туриста</li>
              <li>Отправляет уведомление Принципалу в Telegram</li>
              <li>Ведёт follow-up переписку с туристом (Day+1, Day+2, Day+5)</li>
            </ul>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              AI Lead Processor предоставляется бесплатно в рамках агентского договора.
              Первые 3 месяца &mdash; без ограничений по количеству лидов.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">6. Ответственность</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Принципал несёт полную ответственность перед туристом за качество, безопасность и соответствие описанию оказываемых услуг</li>
              <li>Агент не является туроператором и не несёт ответственности за действия/бездействие Принципала</li>
              <li>Агент не отвечает за ошибки AI-системы при квалификации лидов &mdash; Принципал обязан проверять данные</li>
              <li>При неподтверждении заявки в течение 24 часов Агент вправе предложить туристу альтернативу от другого Принципала</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">7. Срок действия</h2>
            <p>
              Договор вступает в силу с момента регистрации Принципала на платформе
              и действует бессрочно. Любая из сторон вправе расторгнуть договор,
              уведомив другую сторону за 30 дней. Обязательства по оплаченным
              бронированиям сохраняются до их исполнения.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4">8. Реквизиты Агента</h2>
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-sm space-y-1">
              <p><span className="font-semibold">Наименование:</span> ООО &laquo;ПОС-СЕРВИС&raquo;</p>
              <p><span className="font-semibold">ИНН:</span> 4101147649</p>
              <p><span className="font-semibold">ОГРН:</span> 1114101005952</p>
              <p><span className="font-semibold">Адрес:</span> 683024, Камчатский край, г. Петропавловск-Камчатский, пр-кт 50 лет Октября, д. 17/1</p>
              <p><span className="font-semibold">Платформа:</span> tourhab.ru</p>
            </div>
          </section>

        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-4">
          <Link
            href="/operators/join"
            className="ds-btn ds-btn-primary text-center"
          >
            Зарегистрироваться как оператор
          </Link>
          <Link
            href="/for-operators"
            className="ds-btn ds-btn-secondary text-center"
          >
            Подробнее о платформе
          </Link>
        </div>
      </div>
    </main>
    </PageShell>
  );
}
