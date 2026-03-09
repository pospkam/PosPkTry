/**
 * Реальные данные туров с fishingkam.ru
 * Партнер: Камчатская Рыбалка
 * Контакты: +7 914-782-22-22 (Анатолий), +7 999-299-70-07 (Александр)
 */

export interface FishingTourData {
  id: string;
  name: string;
  description: string;
  price: number;
  priceOld?: number;
  duration: number;
  location: string;
  coordinates?: { lat: number; lng: number };
  fishTypes: string[];
  season: { start: string; end: string };
  maxParticipants: number;
  minParticipants?: number;
  includes: string[];
  notIncluded?: string[];
  requirements: string[];
  images: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  rating?: number;
  reviewsCount?: number;
  partner?: string;
  type?: 'daily' | 'multi' | 'family';
}

export const PARTNER_INFO = {
  id: 'kamchatka-fishing',
  name: 'Камчатская Рыбалка',
  website: 'https://fishingkam.ru',
  phones: [
    { name: 'Анатолий', phone: '+7 914-782-22-22' },
    { name: 'Александр', phone: '+7 999-299-70-07' },
  ],
  whatsapp: '+79992997007',
  telegram: '+79992997007',
  workingHours: 'Пн-Пт 00:00 - 10:00 по МСК',
  location: 'Камчатский край',
  description: 'Организовываем рыболовные туры. Уникальные рыболовные маршруты, комфортное размещение и яркие эмоции.',
  features: [
    'Обширная рыболовная территория',
    'Круглогодичная рыбалка',
    'Теплое отношение к гостям',
    'Успешная и безопасная рыбалка',
  ],
};

// Виды рыб доступные для ловли
export const FISH_TYPES = {
  chavycha: { name: 'Чавыча', icon: '🐟', season: ['06', '07'] },
  nerka: { name: 'Нерка', icon: '🐠', season: ['06', '07', '08'] },
  kizhuch: { name: 'Кижуч', icon: '🐟', season: ['08', '09', '10', '11'] },
  mikizha: { name: 'Микижа (радужная форель)', icon: '🐠', season: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] },
  harius: { name: 'Хариус', icon: '🐟', season: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] },
  kunzha: { name: 'Кунжа', icon: '🐠', season: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] },
  golets: { name: 'Голец', icon: '🐟', season: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] },
  goletsKamenets: { name: 'Голец-Каменец', icon: '🐠', season: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] },
};

// Реальные туры с сайта fishingkam.ru
export const FISHING_TOURS: FishingTourData[] = [
  // ОДНОДНЕВНЫЕ ТУРЫ
  {
    id: 'winter-1',
    name: 'Зимняя рыбалка (январь-март)',
    description: 'Зимняя рыбалка на Камчатке с полным комплектом снаряжения. Снегоход, нарта, палатка для зимней рыбалки «HIGASHI» с печкой, ледобур. Минимальная группа — 5 человек.',
    price: 18000,
    priceOld: 20000,
    duration: 1,
    location: 'Камчатский край, рыболовная база',
    fishTypes: ['Микижа', 'Хариус', 'Кунжа', 'Голец', 'Голец-Каменец'],
    season: { start: '01-15', end: '03-20' },
    maxParticipants: 10,
    minParticipants: 5,
    includes: [
      'Размещение на базе',
      'Зимний комплект снаряжения',
      'Снегоход и нарта',
      'Палатка «HIGASHI» с печкой',
      'Ледобур',
      'Сопровождение гида',
    ],
    notIncluded: [
      'Трансфер до базы (от 7000₽)',
      'Одежда и обувь для рыбалки',
      'Повар (по договоренности)',
      'Аренда снастей (по договоренности)',
    ],
    requirements: [
      'Теплая зимняя одежда',
      'Зимняя обувь',
    ],
    images: [],
    difficulty: 'medium',
    rating: 4.8,
    reviewsCount: 24,
    partner: 'Камчатская Рыбалка',
    type: 'daily',
  },
  {
    id: 'winter-2',
    name: 'Зимняя рыбалка (февраль-апрель)',
    description: 'Зимняя рыбалка в период активного клёва. Микижа, хариус, кунжа, голец. Полный комплект зимнего снаряжения включен.',
    price: 22000,
    priceOld: 25000,
    duration: 1,
    location: 'Камчатский край, рыболовная база',
    fishTypes: ['Микижа', 'Хариус', 'Кунжа', 'Голец', 'Голец-Каменец'],
    season: { start: '02-20', end: '04-18' },
    maxParticipants: 10,
    minParticipants: 5,
    includes: [
      'Размещение на базе',
      'Зимний комплект снаряжения',
      'Снегоход и нарта',
      'Палатка «HIGASHI» с печкой',
      'Ледобур',
      'Сопровождение гида',
    ],
    notIncluded: [
      'Трансфер до базы (от 7000₽)',
      'Одежда и обувь для рыбалки',
      'Повар (по договоренности)',
      'Аренда снастей (по договоренности)',
    ],
    requirements: [
      'Теплая зимняя одежда',
      'Зимняя обувь',
    ],
    images: [],
    difficulty: 'medium',
    rating: 4.9,
    reviewsCount: 31,
    partner: 'Камчатская Рыбалка',
    type: 'daily',
  },
  {
    id: 'summer-1',
    name: 'Летняя рыбалка на чавычу и нерку',
    description: 'Летняя рыбалка в период хода чавычи и нерки. Возможность поймать королевского лосося! Чавыча не гарантирована, но шансы высоки в этот период.',
    price: 28000,
    duration: 1,
    location: 'Камчатский край, рыболовная база',
    fishTypes: ['Чавыча', 'Нерка', 'Микижа', 'Хариус', 'Кунжа', 'Голец'],
    season: { start: '06-18', end: '07-20' },
    maxParticipants: 10,
    minParticipants: 5,
    includes: [
      'Размещение на базе',
      'Летний комплект снаряжения',
      'Лодка с мотором',
      'Сопровождение гида',
    ],
    notIncluded: [
      'Трансфер до базы (от 7000₽)',
      'Одежда и обувь для рыбалки',
      'Повар (по договоренности)',
      'Аренда снастей (по договоренности)',
    ],
    requirements: [
      'Непромокаемая одежда',
      'Удобная обувь',
      'Средства от комаров',
    ],
    images: [],
    difficulty: 'easy',
    rating: 4.9,
    reviewsCount: 67,
    partner: 'Камчатская Рыбалка',
    type: 'daily',
  },
  {
    id: 'summer-2',
    name: 'Летняя рыбалка на кижуча',
    description: 'Осенняя рыбалка на серебряного лосося — кижуча. Один из самых сильных и красивых лососей Камчатки. Также доступны микижа, хариус, кунжа, голец.',
    price: 28000,
    duration: 1,
    location: 'Камчатский край, рыболовная база',
    fishTypes: ['Кижуч', 'Микижа', 'Хариус', 'Кунжа', 'Голец', 'Голец-Каменец'],
    season: { start: '08-25', end: '10-30' },
    maxParticipants: 10,
    minParticipants: 5,
    includes: [
      'Размещение на базе',
      'Летний комплект снаряжения',
      'Лодка с мотором',
      'Сопровождение гида',
    ],
    notIncluded: [
      'Трансфер до базы (от 7000₽)',
      'Одежда и обувь для рыбалки',
      'Повар (по договоренности)',
      'Аренда снастей (по договоренности)',
    ],
    requirements: [
      'Непромокаемая одежда',
      'Удобная обувь',
    ],
    images: [],
    difficulty: 'easy',
    rating: 4.8,
    reviewsCount: 52,
    partner: 'Камчатская Рыбалка',
    type: 'daily',
  },
  {
    id: 'autumn-1',
    name: 'Осенняя рыбалка (октябрь-ноябрь)',
    description: 'Поздняя осенняя рыбалка. Кижуч (штучно), микижа, хариус, кунжа, голец. Красивейшее время года на Камчатке.',
    price: 25000,
    duration: 1,
    location: 'Камчатский край, рыболовная база',
    fishTypes: ['Кижуч', 'Микижа', 'Хариус', 'Кунжа', 'Голец', 'Голец-Каменец'],
    season: { start: '10-30', end: '11-15' },
    maxParticipants: 10,
    minParticipants: 5,
    includes: [
      'Размещение на базе',
      'Летний комплект снаряжения',
      'Сопровождение гида',
    ],
    notIncluded: [
      'Трансфер до базы (от 7000₽)',
      'Одежда и обувь для рыбалки',
      'Повар (по договоренности)',
      'Аренда снастей (по договоренности)',
    ],
    requirements: [
      'Теплая непромокаемая одежда',
      'Удобная обувь',
    ],
    images: [],
    difficulty: 'easy',
    rating: 4.7,
    reviewsCount: 28,
    partner: 'Камчатская Рыбалка',
    type: 'daily',
  },
  {
    id: 'winter-late',
    name: 'Зимняя рыбалка (ноябрь-январь)',
    description: 'Начало зимнего сезона. Кижуч (не гарантирован), микижа, хариус, кунжа, голец. Полный комплект зимнего снаряжения.',
    price: 22000,
    priceOld: 25000,
    duration: 1,
    location: 'Камчатский край, рыболовная база',
    fishTypes: ['Кижуч', 'Микижа', 'Хариус', 'Кунжа', 'Голец', 'Голец-Каменец'],
    season: { start: '11-15', end: '01-15' },
    maxParticipants: 10,
    minParticipants: 5,
    includes: [
      'Размещение на базе',
      'Зимний комплект снаряжения',
      'Снегоход и нарта',
      'Палатка «HIGASHI» с печкой',
      'Ледобур',
      'Сопровождение гида',
    ],
    notIncluded: [
      'Трансфер до базы (от 7000₽)',
      'Одежда и обувь для рыбалки',
      'Повар (по договоренности)',
      'Аренда снастей (по договоренности)',
    ],
    requirements: [
      'Теплая зимняя одежда',
      'Зимняя обувь',
    ],
    images: [],
    difficulty: 'medium',
    rating: 4.8,
    reviewsCount: 19,
    partner: 'Камчатская Рыбалка',
    type: 'daily',
  },

  // МНОГОДНЕВНЫЕ ТУРЫ
  {
    id: 'multi-winter-3',
    name: 'Многодневный зимний тур (3 дня)',
    description: 'Трёхдневная зимняя рыбалка с проживанием на комфортабельной базе. Полное погружение в атмосферу камчатской зимней рыбалки.',
    price: 54000,
    priceOld: 60000,
    duration: 3,
    location: 'Камчатский край, рыболовная база',
    fishTypes: ['Микижа', 'Хариус', 'Кунжа', 'Голец', 'Голец-Каменец'],
    season: { start: '01-15', end: '04-18' },
    maxParticipants: 10,
    minParticipants: 5,
    includes: [
      'Проживание на базе 3 ночи',
      'Зимний комплект снаряжения',
      'Снегоход и нарта',
      'Палатка «HIGASHI» с печкой',
      'Ледобур',
      'Сопровождение гида',
    ],
    notIncluded: [
      'Трансфер до базы (от 7000₽)',
      'Питание',
      'Одежда и обувь для рыбалки',
      'Аренда снастей (по договоренности)',
    ],
    requirements: [
      'Теплая зимняя одежда',
      'Зимняя обувь',
    ],
    images: [],
    difficulty: 'medium',
    rating: 4.9,
    reviewsCount: 42,
    partner: 'Камчатская Рыбалка',
    type: 'multi',
  },
  {
    id: 'multi-summer-5',
    name: 'Многодневный летний тур (5 дней)',
    description: 'Пятидневная летняя рыбалка в период хода лосося. Идеальный вариант для полноценного рыболовного отдыха на Камчатке.',
    price: 140000,
    duration: 5,
    location: 'Камчатский край, рыболовная база',
    fishTypes: ['Чавыча', 'Нерка', 'Кижуч', 'Микижа', 'Хариус', 'Кунжа', 'Голец'],
    season: { start: '06-18', end: '10-30' },
    maxParticipants: 10,
    minParticipants: 5,
    includes: [
      'Проживание на базе 5 ночей',
      'Летний комплект снаряжения',
      'Лодка с мотором',
      'Сопровождение гида',
    ],
    notIncluded: [
      'Трансфер до базы (от 7000₽)',
      'Питание',
      'Одежда и обувь для рыбалки',
      'Аренда снастей (по договоренности)',
    ],
    requirements: [
      'Непромокаемая одежда',
      'Удобная обувь',
      'Средства от комаров',
    ],
    images: [],
    difficulty: 'easy',
    rating: 5.0,
    reviewsCount: 38,
    partner: 'Камчатская Рыбалка',
    type: 'multi',
  },
  {
    id: 'multi-week',
    name: 'Недельный рыболовный тур (7 дней)',
    description: 'Полноценная неделя рыбалки на Камчатке. Максимум впечатлений, разнообразие локаций и видов рыбы.',
    price: 196000,
    duration: 7,
    location: 'Камчатский край, рыболовная база',
    fishTypes: ['Чавыча', 'Нерка', 'Кижуч', 'Микижа', 'Хариус', 'Кунжа', 'Голец', 'Голец-Каменец'],
    season: { start: '06-18', end: '10-30' },
    maxParticipants: 8,
    minParticipants: 4,
    includes: [
      'Проживание на базе 7 ночей',
      'Полный комплект снаряжения',
      'Лодка с мотором',
      'Сопровождение опытного гида',
      'Первичная обработка улова',
    ],
    notIncluded: [
      'Трансфер до базы',
      'Питание',
      'Одежда и обувь для рыбалки',
    ],
    requirements: [
      'Непромокаемая одежда',
      'Удобная обувь',
      'Средства от комаров',
    ],
    images: [],
    difficulty: 'easy',
    rating: 5.0,
    reviewsCount: 21,
    partner: 'Камчатская Рыбалка',
    type: 'multi',
  },

  // СЕМЕЙНЫЕ ТУРЫ
  {
    id: 'family-weekend',
    name: 'Семейный тур выходного дня',
    description: 'Идеальный вариант для семейного отдыха. Комфортные условия, безопасная рыбалка, подходит для детей от 10 лет.',
    price: 45000,
    duration: 2,
    location: 'Камчатский край, рыболовная база',
    fishTypes: ['Микижа', 'Хариус', 'Голец'],
    season: { start: '06-01', end: '09-30' },
    maxParticipants: 6,
    minParticipants: 3,
    includes: [
      'Проживание на базе 2 ночи',
      'Снаряжение для всей семьи',
      'Инструктаж для начинающих',
      'Сопровождение гида',
      'Детская программа',
    ],
    notIncluded: [
      'Трансфер до базы',
      'Питание',
    ],
    requirements: [
      'Удобная одежда',
      'Дети от 10 лет',
    ],
    images: [],
    difficulty: 'easy',
    rating: 4.9,
    reviewsCount: 34,
    partner: 'Камчатская Рыбалка',
    type: 'family',
  },
  {
    id: 'family-week',
    name: 'Семейный недельный тур',
    description: 'Неделя семейного отдыха на природе Камчатки. Рыбалка, экскурсии, знакомство с дикой природой.',
    price: 150000,
    duration: 7,
    location: 'Камчатский край, рыболовная база',
    fishTypes: ['Микижа', 'Хариус', 'Кунжа', 'Голец'],
    season: { start: '06-15', end: '09-15' },
    maxParticipants: 8,
    minParticipants: 4,
    includes: [
      'Проживание на базе 7 ночей',
      'Снаряжение для всей семьи',
      'Инструктаж для начинающих',
      'Сопровождение гида',
      'Экскурсионная программа',
      'Детские развлечения',
    ],
    notIncluded: [
      'Трансфер до базы',
      'Питание',
    ],
    requirements: [
      'Удобная одежда',
      'Дети от 7 лет',
    ],
    images: [],
    difficulty: 'easy',
    rating: 5.0,
    reviewsCount: 18,
    partner: 'Камчатская Рыбалка',
    type: 'family',
  },
];

// Функция получения туров по типу
export function getToursByType(type: 'daily' | 'multi' | 'family' | 'all' = 'all'): FishingTourData[] {
  if (type === 'all') return FISHING_TOURS;
  return FISHING_TOURS.filter(tour => tour.type === type);
}

// Функция получения туров по сезону
export function getToursBySeason(month: number): FishingTourData[] {
  const monthStr = month.toString().padStart(2, '0');
  return FISHING_TOURS.filter(tour => {
    const startMonth = parseInt(tour.season.start.split('-')[0]);
    const endMonth = parseInt(tour.season.end.split('-')[0]);
    
    if (startMonth <= endMonth) {
      return month >= startMonth && month <= endMonth;
    } else {
      // Переход через год (например, ноябрь-январь)
      return month >= startMonth || month <= endMonth;
    }
  });
}

// Функция получения тура по ID
export function getTourById(id: string): FishingTourData | undefined {
  return FISHING_TOURS.find(tour => tour.id === id);
}
