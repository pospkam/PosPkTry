import type { Metadata } from 'next';
import { Shield, AlertTriangle, Phone, MapPin, Thermometer, Wind, Navigation, Eye } from 'lucide-react';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'Выживание на Камчатке — офлайн-инструкции | TourHab',
  description: 'Экстренные инструкции для туристов на Камчатке. Медведи, вулканы, гипотермия, потерялся в тайге. Работает без интернета.',
};

// Полностью статическая страница — нет fetch, нет DB.
// Добавлена в PRECACHE_URLS → доступна офлайн сразу после установки PWA.

const SECTIONS = [
  {
    id: 'bear',
    icon: Eye,
    color: 'var(--danger)',
    title: 'Встреча с медведем',
    urgent: 'Никогда не беги — инстинкт преследования сработает мгновенно',
    steps: [
      'Остановись. Говори спокойным низким голосом — дай медведю понять что ты человек.',
      'Медленно отступай боком, не поворачивайся спиной.',
      'Подними руки — выгляди крупнее. Держи антизверь наготове.',
      'Если медведь приближается — шуми, бей в кастрюлю, кричи.',
      'Нападение: бей антизверем в нос и глаза. Лечь нельзя — только активное сопротивление.',
      'Медведица с медвежатами опаснее всего — уходи немедленно при виде детёнышей.',
    ],
  },
  {
    id: 'volcano',
    icon: Wind,
    color: 'var(--accent)',
    title: 'Вулканическая опасность',
    urgent: 'Запах серы + тремор земли = уходи немедленно, не жди',
    steps: [
      'Признаки активизации: запах серы, подземный гул, мелкий тремор, гибель птиц.',
      'Пепловое облако: закрой рот и нос любой тканью, двигайся перпендикулярно ветру.',
      'Лавовый поток медленный — уходи вверх по склону и в сторону от потока.',
      'Пирокластический поток (раскалённый газ) — спасения нет, не допускай такой ситуации.',
      'Сильный пепел: не снимай одежду, пепел режет лёгкие. Укрыться в здании, заткнуть щели.',
      'Термальные поля: никогда не ступай на белую/жёлтую землю — корка тонкая, под ней кипяток.',
    ],
  },
  {
    id: 'hypothermia',
    icon: Thermometer,
    color: 'var(--ocean)',
    title: 'Гипотермия',
    urgent: 'Дрожь прекратилась, человек вялый и хочет спать — критическая стадия',
    steps: [
      'Лёгкая (дрожь, бледность): убери от ветра, сними мокрое, укутай в спальник + поделись теплом тела.',
      'Средняя (нет дрожи, спутанность): горизонтально, не двигай — может остановить сердце.',
      'Тёплое питьё только если человек в сознании и глотает сам. Алкоголь запрещён.',
      'Отогревай тело (грудь, подмышки, пах), не конечности — кровь с холодной периферии убивает.',
      'Мокрая одежда забирает тепло в 25× быстрее сухой. Приоритет — сухость.',
      'Звони 112. Передай координаты. Не оставляй человека одного.',
    ],
  },
  {
    id: 'lost',
    icon: Navigation,
    color: 'var(--success)',
    title: 'Потерялся в тайге',
    urgent: 'СТОП — стой где стоишь, не паникуй, сигнализируй',
    steps: [
      'S.T.O.P.: Stop (стой), Think (думай), Observe (осмотрись), Plan (план).',
      'Не иди наугад — каждый шаг удаляет тебя от зоны поиска.',
      'Признаки реки: иди вниз по склону — выведет к воде, затем к людям.',
      'Костёр: три костра треугольником — международный сигнал бедствия.',
      'Ночлег: лапник на земле 15 см — утеплитель от холода снизу важнее укрытия сверху.',
      'Береги заряд телефона: авиарежим + геолокацию включай только для звонка.',
      'Сообщи координаты в МЧС: широта __ градусов __ минут, долгота __ градусов __ минут.',
    ],
  },
  {
    id: 'signal',
    icon: AlertTriangle,
    color: 'var(--warning)',
    title: 'Сигнализация спасателям',
    urgent: '3 сигнала с паузой — международный знак бедствия',
    steps: [
      'Три костра треугольником (50 м между кострами) — видны с вертолёта.',
      'Зеркало / фольга / телефонный экран: отражай солнце на вертолёт — луч виден на 10+ км.',
      'Три свистка с паузой, три крика, три выстрела — повторяй каждые 10 минут.',
      'Открытое место: выйди на поляну, выложи знак SOS из камней/ветвей (5+ метров высотой буквы).',
      'Яркая одежда: разложи на камнях или снегу — заметна с воздуха.',
      'При звуке вертолёта: разожги костёр с дымом (сырые ветки, листья, резина).',
    ],
  },
  {
    id: 'water',
    icon: MapPin,
    color: 'var(--success)',
    title: 'Вода и еда',
    urgent: 'Без воды — 3 дня. Без еды — 3 недели. Вода — приоритет',
    steps: [
      'Горные ручьи выше населённых пунктов и термальных источников — можно пить.',
      'Термальные источники: вода может содержать мышьяк и сероводород — не пить.',
      'Кипячение 1 минута убивает всё биологическое. Химию не убивает.',
      'Роса: утром собирай тканью с растений — 0.5 л/час при хорошей росе.',
      'Ягоды Камчатки: жимолость (синяя), шикша (чёрная), голубика — съедобны. Красные незнакомые — не трогай.',
      'Рыба в реках: голыми руками не поймать, нужна снасть или острога из ветки.',
    ],
  },
];

export default function OfflineSurvivalPage() {
  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100dvh]">
      <Header />

      <main className="pt-16 pb-24">
        {/* Hero */}
        <section className="ds-section border-b border-[var(--border)]">
          <div className="flex items-start gap-4 max-w-3xl">
            <div className="p-3 rounded-xl flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)' }}>
              <Shield className="w-7 h-7" style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">Офлайн-инструкции</p>
              <h1 className="font-playfair text-3xl font-bold mb-3">Выживание на Камчатке</h1>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Эта страница работает без интернета. Прочитай до выхода на маршрут.
                В экстренной ситуации действуй по инструкции — не импровизируй.
              </p>
            </div>
          </div>
        </section>

        {/* Экстренные контакты — первыми, на видном месте */}
        <section className="ds-section border-b border-[var(--border)]">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-4">Экстренные контакты</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Единый экстренный', number: '112', note: 'Работает без SIM и без баланса' },
                { label: 'МЧС Камчатки', number: '+7 (4152) 41-27-70', note: 'Поисково-спасательная служба' },
                { label: 'МЧС (сотовый)', number: '112', note: 'С мобильного — бесплатно' },
                { label: 'Скорая помощь', number: '103', note: 'Петропавловск-Камчатский' },
              ].map(({ label, number, note }) => (
                <a
                  key={number + label}
                  href={`tel:${number.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-sm active:scale-95"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  <div className="p-2 rounded-lg flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)' }}>
                    <Phone className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{label}</p>
                    <p className="font-bold text-[var(--text-primary)] text-lg leading-tight">{number}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{note}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Инструкции */}
        <section className="ds-section">
          <div className="max-w-2xl space-y-6">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.id}
                  className="rounded-xl border overflow-hidden"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
                >
                  {/* Заголовок */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `color-mix(in srgb, ${section.color} 12%, transparent)` }}>
                      <Icon className="w-4 h-4" style={{ color: section.color }} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[var(--text-primary)]">{section.title}</h2>
                    </div>
                  </div>

                  {/* Urgent */}
                  <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)', background: `color-mix(in srgb, ${section.color} 6%, transparent)` }}>
                    <p className="text-sm font-medium" style={{ color: section.color }}>{section.urgent}</p>
                  </div>

                  {/* Шаги */}
                  <ol className="px-5 py-4 space-y-3">
                    {section.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                          style={{ background: `color-mix(in srgb, ${section.color} 15%, transparent)`, color: section.color }}>
                          {i + 1}
                        </span>
                        <span className="text-[var(--text-secondary)] leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer note */}
        <section className="ds-section">
          <div className="max-w-2xl p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Эта страница сохранена на твоём устройстве и работает без интернета.
              Перед каждым выходом на маршрут сообщи кому-то маршрут и дату возвращения.
              Зарегистрируй группу в МЧС на маршрутах с обязательной регистрацией.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
