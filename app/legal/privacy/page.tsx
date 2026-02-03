import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = {
  title: 'Политика конфиденциальности | KamHub',
  description: 'Политика обработки персональных данных платформы KamHub',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-transparent text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-premium-gold hover:text-premium-gold/80 mb-8">
          <ChevronLeft className="w-5 h-5 mr-1" />
          На главную
        </Link>

        <h1 className="text-3xl font-bold mb-8">Политика конфиденциальности</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-white/80">
          <p className="text-sm text-white/50">Дата вступления в силу: 1 января 2025 г.</p>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Общие положения</h2>
            <p>
              Настоящая Политика конфиденциальности (далее — Политика) определяет порядок обработки 
              и защиты персональных данных пользователей платформы KamHub (далее — Платформа), 
              принадлежащей ООО «КамХаб» (далее — Оператор).
            </p>
            <p>
              Политика разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ 
              «О персональных данных».
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Персональные данные</h2>
            <p>Оператор обрабатывает следующие персональные данные:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Фамилия, имя, отчество</li>
              <li>Адрес электронной почты</li>
              <li>Номер телефона</li>
              <li>Данные документов (для партнеров: ИНН, ОГРН, банковские реквизиты)</li>
              <li>IP-адрес и данные cookies</li>
              <li>История бронирований и транзакций</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Цели обработки</h2>
            <p>Персональные данные обрабатываются в целях:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Регистрации и идентификации пользователей</li>
              <li>Оказания услуг бронирования</li>
              <li>Проведения расчетов с партнерами</li>
              <li>Направления уведомлений о бронированиях</li>
              <li>Улучшения качества сервиса</li>
              <li>Исполнения требований законодательства РФ</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Правовые основания</h2>
            <p>Обработка персональных данных осуществляется на основании:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Согласия субъекта персональных данных</li>
              <li>Договора, стороной которого является субъект</li>
              <li>Требований законодательства РФ</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Хранение данных</h2>
            <p>
              Персональные данные хранятся на серверах, расположенных на территории Российской Федерации, 
              в соответствии с требованиями Федерального закона № 242-ФЗ.
            </p>
            <p>
              Срок хранения персональных данных — до момента отзыва согласия или достижения целей обработки, 
              но не менее сроков, установленных законодательством РФ.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Права субъекта</h2>
            <p>Субъект персональных данных имеет право:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Получить информацию об обработке своих данных</li>
              <li>Требовать уточнения, блокирования или уничтожения данных</li>
              <li>Отозвать согласие на обработку</li>
              <li>Обжаловать действия Оператора в Роскомнадзор</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-4">7. Контакты</h2>
            <p>
              По вопросам обработки персональных данных обращайтесь:<br />
              Email: privacy@kamhub.ru<br />
              Адрес: 683000, Камчатский край, г. Петропавловск-Камчатский
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
