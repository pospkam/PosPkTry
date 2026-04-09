/**
 * Intent classifier — определяет намерение пользователя.
 *
 * Чистая функция, без зависимостей — легко тестируется.
 * Используется PlatformAgent как первый (быстрый) проход перед AI fallback.
 */

import type { AgentIntent } from './platform-agent';

// ── Keyword map ────────────────────────────────────────────────────────────────

export const INTENT_KEYWORDS: Record<AgentIntent, string[]> = {
  admin_digest:      ['дайджест', 'digest', 'сводка', 'итоги', 'обзор платформы'],
  admin_health:      ['здоровье', 'health', 'состояние системы', 'diag', 'диагностика'],
  admin_leads:       ['лиды', 'лидов', 'лидам', 'leads', 'заявки', 'обращения'],
  op_tours_summary:  ['мои туры', 'список туров', 'туры оператора', 'расписание туров', 'покажи туры'],
  op_bookings_today: ['бронирования сегодня', 'брони сегодня', 'сегодня бронирования'],
  op_revenue:        ['выручка', 'доходы', 'revenue', 'заработал', 'прибыль', 'деньги за'],
  op_create_tour:    [
    'создай тур', 'новый тур', 'добавь тур', 'создать тур', 'добавить тур',
    'хочу создать', 'сделай тур',
  ],
  op_fill_ai:        [
    'заполни тур', 'заполнить тур', 'ai заполнение', 'запусти заполнение',
    'автозаполнение', 'заполни ai', 'fill ai', 'автоматически заполни',
  ],
  op_add_slots:      [
    'добавь слоты', 'добавить слоты', 'новые слоты', 'слоты на', 'добавь даты',
    'добавить даты', 'расписание добавь', 'открой даты',
  ],
  tourist_recommend: [
    'рекомендуй тур', 'посоветуй', 'хочу тур', 'что посмотреть на камчатке',
    'хочу на камчатку', 'вулкан', 'рыбалка', 'медведи', 'гейзер', 'трекинг',
    'горячие источники', 'маршрут на камчатке', 'отдых на камчатке',
  ],
  // AI Юрист
  legal_contract:    [
    'проверь договоры', 'юридическая проверка', 'договоры туров', 'условия туров',
    'политика отмены', 'legal check', 'юрист', 'проверь контракты',
  ],
  legal_compliance:  [
    'аудит соответствия', 'compliance', 'нарушения требований', 'правовой аудит',
    'соответствие законодательству', 'проверь операторов', 'юридический аудит',
  ],
  legal_risks:       [
    'юридические риски', 'legal risks', 'риски бронирований', 'правовые риски',
    'риски договоров', 'анализ рисков юрист',
  ],
  legal_affiliate_audit: [
    'аудит рекламы', 'маркировка рекламы', 'erid', 'affiliate audit',
    'аффилиатная маркировка', 'проверь рекламу', 'фз-38 реклама',
  ],
  legal_platform_audit: [
    'платформенный аудит', 'platform audit', 'аудит платформы',
    'ркн аудит', 'compliance платформы', 'проверь платформу юрист',
  ],
  // AI Служба безопасности
  sec_access_audit:  [
    'аудит доступа', 'подозрительная активность', 'security audit', 'проверь безопасность',
    'кто входил', 'аудит входов', 'безопасность доступа',
  ],
  sec_anomaly:       [
    'аномалии', 'подозрительные бронирования', 'fraud', 'мошенничество',
    'аномальные платежи', 'странные брони', 'detect anomaly',
  ],
  sec_report:        [
    'отчёт безопасности', 'security report', 'состояние безопасности',
    'служба безопасности', 'безопасность платформы', 'полный security',
  ],
  // AI Хакер (growth hacker)
  hack_growth:       [
    'точки роста', 'growth hack', 'рост платформы', 'конверсия', 'как вырасти',
    'что улучшить', 'анализ роста', 'growth analysis',
  ],
  hack_funnel:       [
    'воронка', 'funnel', 'где теряем', 'потери конверсии', 'воронка продаж',
    'анализ воронки', 'где уходят пользователи',
  ],
  hack_automate:     [
    'что автоматизировать', 'automation', 'автоматизация', 'автоматические задачи',
    'automate', 'что можно автоматизировать', 'ботом',
  ],
  // AI Спасатель
  rescue_sos_stats:  [
    'sos статистика', 'инциденты', 'sos события', 'активные sos',
    'сигналы бедствия', 'rescue stats', 'sos мониторинг',
  ],
  rescue_weather_risk: [
    'погодные риски', 'риски погоды', 'weather risk', 'угроза погода',
    'опасные туры погода', 'предупреждения туры', 'спасатель погода',
  ],
  rescue_protocols:  [
    'протоколы', 'экстренные протоколы', 'emergency protocols', 'спасение',
    'мчс', 'инструкция sos', 'алгоритм спасения', 'что делать при sos',
  ],
  // AI Эколог
  eco_impact:        [
    'экологическое воздействие', 'eco impact', 'нагрузка на природу',
    'экология туризма', 'зелёный туризм', 'эколог', 'eco points отчёт',
  ],
  eco_zones:         [
    'охраняемые зоны', 'заповедник', 'eco zones', 'кроноцкий',
    'природные зоны', 'зоны камчатки', 'экологические зоны', 'фгбу',
  ],
  // AI Эволюция
  evo_optimize:      [
    'самооптимизация', 'оптимизируй агентов', 'улучши систему',
    'слабые агенты', 'evo optimize', 'эволюция агентов', 'самоанализ',
  ],
  evo_experiments:   [
    'создай эксперимент', 'auto ab test', 'запусти тест', 'авто эксперимент',
    'evo experiment', 'новый тест агентов',
  ],
  evo_adapt:         [
    'адаптация', 'учись на ошибках', 'обучение агентов', 'evo adapt',
    'адаптируй агентов', 'изучи фидбек', 'learn from feedback',
  ],
  // Контент
  content_audit:     [
    'аудит контента', 'content audit', 'качество туров', 'заполненность туров',
    'проверь туры контент', 'что не заполнено',
  ],
  content_flag:      [
    'туры для заполнения', 'content flag', 'кандидаты ai заполнения', 'flagged tours',
    'что заполнить',
  ],
  // Публикация в каналы (ДОЛЖНЫ БЫТЬ ДО plan_season — иначе «сезонный пост» → Planning)
  channel_post_route: [
    'пост о маршруте', 'опубликуй маршрут', 'пост маршрут', 'кузьмич маршрут',
    'напиши пост маршрут', '/kuzmich', 'kuzmich route',
    // Широкие: "опубликуй пост про X" — любая тема кроме сезона/совета
    'опубликуй пост про', 'создай пост про', 'напиши пост про',
    'пост про рыбалку', 'пост про вулкан', 'пост про камчатку',
    'пост в канал', 'опубликуй в канал', 'запости в канал',
    'дай команду опубликовать', 'опубликуй пост',
  ],
  channel_post_tip:   [
    'пост совет', 'опубликуй совет', 'совет кузьмича', 'совет для туристов',
    'напиши совет', '/tip', 'kuzmich tip',
  ],
  channel_post_sezon: [
    'сезонный пост', 'пост о сезоне', 'пост сезон', 'опубликуй сезон',
    'напиши сезонный', 'сезонный в тг', 'сезонный в канал', 'sezon post',
    '/sezon',
  ],
  channel_audit:      [
    'аудит канала', 'аудит постов', 'channel audit', 'качество постов',
    'статистика канала', 'отчёт канала', 'сколько постов',
  ],
  // Маркетинг
  mkt_performance:   [
    'маркетинг', 'marketing', 'эффективность маркетинга', 'трафик источники',
    'откуда приходят', 'мкт отчёт', 'marketing performance',
  ],
  mkt_content_plan:  [
    'контент-план', 'план публикаций', 'content plan', 'telegram план',
    'что постить', 'план контента', 'контентный план',
  ],
  // Планирование
  plan_forecast:     [
    'прогноз', 'forecast', 'тренд бронирований', 'прогноз продаж',
    'предсказание', 'plan forecast', 'тренд',
  ],
  plan_season:       [
    'сезон', 'сезонность', 'season analysis', 'по месяцам',
    'сезонный анализ', 'план сезон',
  ],
  plan_gaps:         [
    'пробелы', 'нехватка туров', 'gaps', 'gap analysis',
    'план пробелы', 'дефицит туров', 'что не хватает',
  ],
  // Качество
  qa_reviews:        [
    'отзывы', 'reviews', 'рейтинг туров', 'оценки туристов',
    'qa отзывы', 'аномалии отзывов', 'плохие отзывы',
  ],
  qa_slots:          [
    'слоты', 'qa слоты', 'туры без слотов', 'доступность туров',
    'нет расписания', 'slots check',
  ],
  qa_operators:      [
    'здоровье операторов', 'operator health', 'qa операторы',
    'активность операторов', 'слабые операторы',
  ],
  lead_qualify:      [
    'квалифицируй лиды', 'evaluate leads', 'оценить лиды', 'analyse leads', 'проверь активных',
  ],
  lead_suggest:      [
    'рекомендуй туры', 'suggest tours', 'какие туры предложить', 'подбери тур для лида',
  ],
  // Гид
  guide_schedule:    [
    'мои назначения', 'расписание гида', 'мои туры как гид', 'предстоящие туры гида',
    'schedule guide', 'туры гида',
  ],
  guide_groups:      [
    'мои группы', 'активные группы', 'туристы в группах', 'группы гида', 'guide groups',
  ],
  guide_earnings:    [
    'мой заработок', 'гид заработок', 'доход гида', 'earnings guide', 'сколько заработал гид',
  ],
  guide_status:      [
    'статус гида', 'guide status', 'моя статистика гид', 'дашборд гида', 'обзор гида',
  ],
  // Трансфер-оператор
  transfer_fleet:    [
    'мой автопарк', 'флот', 'транспортные средства', 'fleet', 'мои машины', 'автомобили',
  ],
  transfer_drivers:  [
    'мои водители', 'список водителей', 'drivers', 'водители трансфер',
  ],
  transfer_bookings: [
    'бронирования трансфер', 'заказы трансфер', 'transfer bookings', 'трансферы сегодня',
  ],
  transfer_status:   [
    'статус трансфер', 'transfer status', 'дашборд трансфер', 'обзор трансфер',
  ],
  unknown: [],
};

const ADMIN_INTENTS    = new Set<AgentIntent>([
  'admin_digest', 'admin_health', 'admin_leads',
  'lead_qualify', 'lead_suggest',
  'legal_contract', 'legal_compliance', 'legal_risks',
  'legal_affiliate_audit', 'legal_platform_audit',
  'sec_access_audit', 'sec_anomaly', 'sec_report',
  'hack_growth', 'hack_funnel', 'hack_automate',
  'rescue_sos_stats', 'rescue_weather_risk',
  'eco_impact', 'eco_zones',
  'evo_optimize', 'evo_experiments', 'evo_adapt',
  'content_audit', 'content_flag',
  'channel_post_route', 'channel_post_tip', 'channel_post_sezon', 'channel_audit',
  'mkt_performance', 'mkt_content_plan',
  'plan_forecast', 'plan_season', 'plan_gaps',
  'qa_reviews', 'qa_slots', 'qa_operators',
]);
const OPERATOR_INTENTS = new Set<AgentIntent>([
  'op_tours_summary', 'op_bookings_today', 'op_revenue',
  'op_create_tour', 'op_fill_ai', 'op_add_slots',
]);

/**
 * Определить намерение по ключевым словам.
 *
 * @param message   Текст пользователя
 * @param role      Роль пользователя (фильтрует нерелевантные интенты)
 */
export function classifyIntentByKeywords(
  message: string,
  role?: string
): AgentIntent {
  const lower    = message.toLowerCase();
  const isAdmin  = role === 'admin';
  const isOp     = role === 'operator';

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [AgentIntent, string[]][]) {
    if (intent === 'unknown') continue;

    // Фильтрация по роли
    if (ADMIN_INTENTS.has(intent)    && !isAdmin) continue;
    if (OPERATOR_INTENTS.has(intent) && role && !isOp && !isAdmin) continue;

    if (keywords.some(k => lower.includes(k))) return intent;
  }

  return 'unknown';
}

export type { AgentIntent };
