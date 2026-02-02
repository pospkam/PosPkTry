import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = {
  title: 'Пользовательское соглашение | KamHub',
  description: 'Условия использования платформы KamHub',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-transparent text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-premium-gold hover:text-premium-gold/80 mb-8">
          <ChevronLeft className="w-5 h-5 mr-1" />
          На главную
        </Link>

        <h1 className="text-3xl font-bold mb-8">Пользовательское соглашение</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-white/80">
          <p className="text-sm text-white/50">Редакция от 1 января 2025 г.</p>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Термины и определения</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Платформа</strong> — интернет-сервис KamHub, доступный по адресу kamhub.ru</li>
              <li><strong>Пользователь</strong> — физическое лицо, использующее Платформу</li>
              <li><strong>Партнер</strong> — юридическое лицо или ИП, оказывающее услуги через Платформу</li>
              <li><strong>Услуги</strong> — туры, трансферы, размещение и другие туристические услуги</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Предмет соглашения</h2>
            <p>
              Настоящее Соглашение регулирует отношения между Платформой и Пользователем 
              при использовании сервисов бронирования туристических услуг.
            </p>
            <p>
              Платформа является информационным посредником между Пользователями и Партнерами 
              и не является туроператором или турагентом.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Регистрация</h2>
            <p>
              Для использования полного функционала Платформы требуется регистрация. 
              При регистрации Пользователь обязуется предоставить достоверные данные.
            </p>
            <p>
              Пользователь несет ответственность за сохранность своих учетных данных.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Бронирование услуг</h2>
            <p>
              Бронирование услуг осуществляется путем оформления заказа на Платформе и его оплаты.
            </p>
            <p>
              Договор на оказание туристических услуг заключается непосредственно между 
              Пользователем и Партнером. Платформа не является стороной данного договора.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Оплата</h2>
            <p>
              Оплата услуг производится через платежную систему Платформы. 
              Платформа обеспечивает безопасность платежей в соответствии со стандартом PCI DSS.
            </p>
            <p>
              Возврат денежных средств осуществляется в соответствии с политикой отмены 
              конкретного Партнера и законодательством РФ.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Ответственность</h2>
            <p>
              Платформа не несет ответственности за качество услуг, оказываемых Партнерами.
            </p>
            <p>
              Все претензии по качеству услуг направляются непосредственно Партнеру.
            </p>
            <p>
              Платформа прилагает разумные усилия для проверки Партнеров, но не гарантирует 
              их надежность.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">7. Интеллектуальная собственность</h2>
            <p>
              Все материалы Платформы (тексты, изображения, код) являются собственностью 
              Оператора или используются на законных основаниях.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">8. Изменение условий</h2>
            <p>
              Оператор вправе изменять условия Соглашения. Актуальная версия всегда доступна 
              на данной странице. Продолжение использования Платформы означает согласие с изменениями.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">9. Применимое право</h2>
            <p>
              Настоящее Соглашение регулируется законодательством Российской Федерации. 
              Споры разрешаются в суде по месту нахождения Оператора.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
