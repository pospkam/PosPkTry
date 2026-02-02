import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = {
  title: 'Договор-оферта для партнеров | KamHub',
  description: 'Условия сотрудничества с платформой KamHub для партнеров',
};

export default function OfferPage() {
  return (
    <main className="min-h-screen bg-transparent text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-premium-gold hover:text-premium-gold/80 mb-8">
          <ChevronLeft className="w-5 h-5 mr-1" />
          На главную
        </Link>

        <h1 className="text-3xl font-bold mb-8">Договор-оферта для партнеров</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-white/80">
          <p className="text-sm text-white/50">Редакция от 1 января 2025 г.</p>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Предмет договора</h2>
            <p>
              ООО «КамХаб» (далее — Платформа) предлагает юридическим лицам и индивидуальным 
              предпринимателям (далее — Партнер) заключить настоящий договор на условиях, 
              изложенных ниже.
            </p>
            <p>
              Платформа предоставляет Партнеру возможность размещения информации о своих 
              услугах и приема бронирований через сервис KamHub.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Акцепт оферты</h2>
            <p>
              Акцептом настоящей оферты является регистрация Партнера на Платформе и 
              проставление отметки о согласии с условиями договора.
            </p>
            <p>
              Договор считается заключенным с момента акцепта.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Обязанности Платформы</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Размещение информации об услугах Партнера</li>
              <li>Обеспечение приема и обработки бронирований</li>
              <li>Прием платежей от клиентов</li>
              <li>Перечисление денежных средств Партнеру за вычетом комиссии</li>
              <li>Техническая поддержка личного кабинета</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Обязанности Партнера</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Предоставление достоверной информации об услугах</li>
              <li>Своевременное обновление цен и наличия</li>
              <li>Качественное оказание забронированных услуг</li>
              <li>Соблюдение законодательства РФ о туристской деятельности</li>
              <li>Наличие необходимых лицензий и разрешений</li>
              <li>Страхование ответственности (для туроператоров)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Комиссия платформы</h2>
            <div className="bg-premium-gold/10 border border-premium-gold/30 rounded-xl p-4 my-4">
              <p className="text-premium-gold font-semibold">
                Комиссия Платформы составляет 10% от стоимости каждого бронирования.
              </p>
            </div>
            <p>
              Комиссия удерживается автоматически при перечислении средств Партнеру.
            </p>
            <p>
              Комиссия включает: размещение на платформе, обработку платежей, 
              техническую поддержку, маркетинговое продвижение.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Порядок расчетов</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Клиент оплачивает бронирование через Платформу</li>
              <li>Средства поступают на счет Платформы</li>
              <li>После оказания услуги Платформа перечисляет средства Партнеру за вычетом комиссии</li>
              <li>Срок перечисления — 3 рабочих дня после подтверждения оказания услуги</li>
              <li>Минимальная сумма выплаты — 1000 рублей</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">7. Отмена бронирований</h2>
            <p>
              Политика отмены определяется Партнером при создании услуги. 
              Партнер обязан соблюдать заявленную политику отмены.
            </p>
            <p>
              При отмене по вине Партнера комиссия Платформы не возвращается.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">8. Ответственность</h2>
            <p>
              Партнер несет полную ответственность за качество оказываемых услуг 
              и соответствие их описанию на Платформе.
            </p>
            <p>
              Платформа не несет ответственности за действия Партнера.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">9. Срок действия</h2>
            <p>
              Договор действует бессрочно. Любая из сторон может расторгнуть договор, 
              уведомив другую сторону за 30 дней.
            </p>
            <p>
              При расторжении все принятые бронирования должны быть исполнены.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">10. Реквизиты Платформы</h2>
            <p>
              ООО «КамХаб»<br />
              ИНН: 4101XXXXXX<br />
              ОГРН: 1234567890123<br />
              Адрес: 683000, Камчатский край, г. Петропавловск-Камчатский<br />
              Email: partners@kamhub.ru
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
