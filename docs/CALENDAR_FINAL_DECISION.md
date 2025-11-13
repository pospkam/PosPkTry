# ✅ ИТОГОВОЕ РЕШЕНИЕ: КАЛЕНДАРЬ БРОНИРОВАНИЙ
## Финальный план реализации

**Дата:** 5 ноября 2025  
**Статус:** Готов к реализации

---

## 🎯 ЧТО МЫ РЕШИЛИ

### ПРОБЛЕМА
Нужен **универсальный календарь** для 3 типов бронирований:
1. **Отели** - диапазон дат (check-in → check-out)
2. **Туры** - фиксированные или гибкие даты + время
3. **Трансферы** - дата + расписание рейсов

### РЕШЕНИЕ ⭐
**Модульный подход на базе React-DatePicker**

Создаём **3 специализированных компонента**, которые используют общую базу:

```
BaseCalendar (общая логика)
    ↓
├─ StayDatePicker (отели)
├─ TourDatePicker (туры)
└─ TransferDateTimePicker (трансферы)
```

---

## 📦 ТЕХНИЧЕСКИЙ СТЕК

### Основная библиотека
```json
{
  "react-datepicker": "^4.21.0",
  "@types/react-datepicker": "^4.19.0",
  "date-fns": "^2.30.0"
}
```

**Почему React-DatePicker:**
- ✅ 3.9M скачиваний/неделю (самая популярная)
- ✅ Полная поддержка TypeScript
- ✅ Гибкая кастомизация
- ✅ Русская локализация из коробки
- ✅ Поддержка диапазонов, блокировки дат, custom рендеринг
- ✅ Проверена временем (с 2016 года)

### Дополнительные инструменты
```json
{
  "clsx": "^2.0.0",          // для условных классов
  "react-hot-toast": "^2.4.1" // для уведомлений
}
```

---

## 🏗️ АРХИТЕКТУРА

### Структура файлов

```
app/
├── components/
│   └── booking/
│       ├── calendars/
│       │   ├── BaseCalendar.tsx                 # Общая база
│       │   ├── StayDatePicker.tsx              # Для отелей
│       │   ├── TourDatePicker.tsx              # Для туров
│       │   ├── TransferDateTimePicker.tsx      # Для трансферов
│       │   ├── calendar.module.css             # Стили
│       │   └── calendar-utils.ts               # Утилиты
│       │
│       ├── forms/
│       │   ├── BookingFormWrapper.tsx          # Общая обёртка
│       │   ├── StayBookingForm.tsx             # Форма для отелей
│       │   ├── TourBookingForm.tsx             # Форма для туров
│       │   └── TransferBookingForm.tsx         # Форма для трансферов
│       │
│       └── ui/
│           ├── GuestSelector.tsx               # Выбор гостей
│           ├── TimeSlotPicker.tsx              # Выбор времени
│           ├── PriceBreakdown.tsx              # Разбивка цены
│           ├── AvailabilityIndicator.tsx       # Индикатор доступности
│           └── BookingTimer.tsx                # Таймер бронирования
│
├── lib/
│   └── booking/
│       ├── availability-checker.ts             # Проверка доступности
│       ├── price-calculator.ts                 # Расчёт цены
│       └── booking-validator.ts                # Валидация
│
└── app/
    └── api/
        ├── accommodations/[id]/availability/   # API для отелей
        ├── tours/[id]/available-dates/         # API для туров
        └── transfers/[id]/schedules/           # API для трансферов
```

---

## 📋 ПЛАН РЕАЛИЗАЦИИ

### ФАЗА 1: ПОДГОТОВКА (1-2 часа)

#### Шаг 1.1: Установка зависимостей
```bash
npm install react-datepicker date-fns clsx react-hot-toast
npm install --save-dev @types/react-datepicker
```

#### Шаг 1.2: Настройка базовых стилей
- Создать `calendar.module.css`
- Импортировать стили React-DatePicker
- Кастомизация под дизайн KamHub

#### Шаг 1.3: Создать утилиты
- `calendar-utils.ts` - функции работы с датами
- Валидация, форматирование, расчёты

---

### ФАЗА 2: БАЗОВЫЙ КАЛЕНДАРЬ (2-3 часа)

#### Шаг 2.1: BaseCalendar компонент
```tsx
// BaseCalendar.tsx
import DatePicker from 'react-datepicker';
import { ru } from 'date-fns/locale';

interface BaseCalendarProps {
  minDate?: Date;
  maxDate?: Date;
  excludeDates?: Date[];
  onDateChange: (date: Date | [Date, Date] | null) => void;
  // ... другие общие пропсы
}

export const BaseCalendar = ({ ... }: BaseCalendarProps) => {
  return (
    <DatePicker
      locale={ru}
      minDate={minDate || new Date()}
      // ... базовая конфигурация
    />
  );
};
```

#### Шаг 2.2: Кастомные стили
- Цвета проекта (чёрный + золотой)
- Анимации
- Hover эффекты

---

### ФАЗА 3: КАЛЕНДАРЬ ДЛЯ ОТЕЛЕЙ (3-4 часа)

#### Шаг 3.1: StayDatePicker
```tsx
interface StayDatePickerProps {
  accommodationId: string;
  minNights?: number;
  onDatesChange: (checkIn: Date, checkOut: Date) => void;
}

export const StayDatePicker = ({ 
  accommodationId, 
  minNights = 1,
  onDatesChange 
}: StayDatePickerProps) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);

  // Загрузка занятых дат
  useEffect(() => {
    loadBlockedDates();
  }, [accommodationId]);

  const loadBlockedDates = async () => {
    setLoading(true);
    const response = await fetch(
      `/api/accommodations/${accommodationId}/blocked-dates`
    );
    const data = await response.json();
    setBlockedDates(data.blockedDates);
    setLoading(false);
  };

  // Валидация диапазона
  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);

    if (start && end) {
      const nights = differenceInDays(end, start);
      
      if (nights < minNights) {
        toast.error(`Минимум ${minNights} ночи`);
        return;
      }

      onDatesChange(start, end);
    }
  };

  return (
    <DatePicker
      selectsRange
      startDate={startDate}
      endDate={endDate}
      onChange={handleDateChange}
      excludeDates={blockedDates}
      minDate={new Date()}
      monthsShown={2}
      locale={ru}
      inline
      disabled={loading}
    />
  );
};
```

#### Шаг 3.2: API endpoint
```typescript
// app/api/accommodations/[id]/availability/route.ts

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const checkIn = searchParams.get('checkIn');
  const checkOut = searchParams.get('checkOut');

  // Проверка доступности
  const available = await checkAvailability(params.id, checkIn, checkOut);

  return Response.json({ available });
}
```

---

### ФАЗА 4: КАЛЕНДАРЬ ДЛЯ ТУРОВ (3-4 часа)

#### Шаг 4.1: TourDatePicker
```tsx
interface TourDatePickerProps {
  tourId: string;
  tourType: 'group' | 'individual';
  onDateSelect: (date: Date, timeSlot?: string) => void;
}

export const TourDatePicker = ({
  tourId,
  tourType,
  onDateSelect
}: TourDatePickerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Для групповых туров - загрузка фиксированных дат
  useEffect(() => {
    if (tourType === 'group') {
      loadAvailableDates();
    }
  }, [tourId, tourType]);

  const loadAvailableDates = async () => {
    const response = await fetch(`/api/tours/${tourId}/available-dates`);
    const data = await response.json();
    setAvailableDates(data.dates);
  };

  // При выборе даты загрузить слоты времени
  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);

    if (tourType === 'individual') {
      const response = await fetch(
        `/api/tours/${tourId}/time-slots?date=${format(date, 'yyyy-MM-dd')}`
      );
      const data = await response.json();
      setTimeSlots(data.slots);
    } else {
      onDateSelect(date);
    }
  };

  // Кастомный рендеринг дней с индикаторами
  const renderDayContents = (day: number, date: Date) => {
    const dateInfo = availableDates.find(
      d => isSameDay(new Date(d.date), date)
    );

    if (!dateInfo) return day;

    return (
      <div className="relative">
        <span>{day}</span>
        <AvailabilityIndicator available={dateInfo.available} />
      </div>
    );
  };

  return (
    <div>
      <DatePicker
        selected={selectedDate}
        onChange={handleDateSelect}
        includeDates={
          tourType === 'group' 
            ? availableDates.map(d => new Date(d.date))
            : undefined
        }
        minDate={new Date()}
        locale={ru}
        inline
        renderDayContents={renderDayContents}
      />

      {/* Показ слотов времени для индивидуальных туров */}
      {tourType === 'individual' && timeSlots.length > 0 && (
        <TimeSlotPicker
          slots={timeSlots}
          onSelect={(slot) => onDateSelect(selectedDate!, slot.time)}
        />
      )}
    </div>
  );
};
```

---

### ФАЗА 5: КАЛЕНДАРЬ ДЛЯ ТРАНСФЕРОВ (3-4 часа)

#### Шаг 5.1: TransferDateTimePicker
```tsx
interface TransferDateTimePickerProps {
  routeId: string;
  onScheduleSelect: (scheduleId: string, date: Date) => void;
}

export const TransferDateTimePicker = ({
  routeId,
  onScheduleSelect
}: TransferDateTimePickerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);

  // При выборе даты загрузить расписание
  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setLoading(true);

    const response = await fetch(
      `/api/transfers/${routeId}/schedules?date=${format(date, 'yyyy-MM-dd')}`
    );
    const data = await response.json();
    setSchedules(data.schedules);
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Календарь слева */}
      <div>
        <DatePicker
          selected={selectedDate}
          onChange={handleDateSelect}
          minDate={new Date()}
          locale={ru}
          inline
        />
      </div>

      {/* Расписание справа */}
      <div>
        {loading ? (
          <LoadingSpinner />
        ) : selectedDate && schedules.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">
              Рейсы на {format(selectedDate, 'd MMMM', { locale: ru })}
            </h3>
            {schedules.map(schedule => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                onSelect={() => onScheduleSelect(schedule.id, selectedDate)}
              />
            ))}
          </div>
        ) : selectedDate ? (
          <div className="text-center text-gray-500">
            Нет доступных рейсов на эту дату
          </div>
        ) : (
          <div className="text-center text-gray-500">
            Выберите дату чтобы увидеть расписание
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### ФАЗА 6: UI КОМПОНЕНТЫ (2-3 часа)

#### GuestSelector
```tsx
interface GuestSelectorProps {
  maxGuests?: number;
  onChange: (adults: number, children: number) => void;
}

export const GuestSelector = ({ maxGuests = 20, onChange }: GuestSelectorProps) => {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span>Взрослые</span>
        <div className="flex items-center space-x-3">
          <button onClick={() => setAdults(Math.max(1, adults - 1))}>-</button>
          <span>{adults}</span>
          <button onClick={() => setAdults(Math.min(maxGuests, adults + 1))}>+</button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span>Дети</span>
        <div className="flex items-center space-x-3">
          <button onClick={() => setChildren(Math.max(0, children - 1))}>-</button>
          <span>{children}</span>
          <button onClick={() => setChildren(children + 1)}>+</button>
        </div>
      </div>
    </div>
  );
};
```

#### AvailabilityIndicator
```tsx
interface AvailabilityIndicatorProps {
  available: number;
  total?: number;
}

export const AvailabilityIndicator = ({ 
  available, 
  total 
}: AvailabilityIndicatorProps) => {
  const getColor = () => {
    if (available === 0) return 'bg-red-500';
    if (available < 5) return 'bg-yellow-500';
    if (available >= 10) return 'bg-green-500';
    return 'bg-white';
  };

  return (
    <div className={`w-2 h-2 rounded-full ${getColor()} absolute bottom-1 right-1`} />
  );
};
```

---

### ФАЗА 7: ФОРМЫ БРОНИРОВАНИЯ (3-4 часа)

Создать полные формы с интеграцией календарей:
- StayBookingForm
- TourBookingForm
- TransferBookingForm

---

### ФАЗА 8: API ENDPOINTS (2-3 часа)

#### Необходимые эндпоинты:
```
GET /api/accommodations/[id]/blocked-dates
GET /api/accommodations/[id]/availability
GET /api/tours/[id]/available-dates
GET /api/tours/[id]/time-slots
GET /api/transfers/[id]/schedules
POST /api/transfers/hold-seats
```

---

### ФАЗА 9: ТЕСТИРОВАНИЕ (2-3 часа)

- Unit тесты для утилит
- Интеграционные тесты для форм
- E2E тесты для полного flow бронирования
- Тестирование на мобильных устройствах

---

### ФАЗА 10: ПОЛИРОВКА (2-3 часа)

- Accessibility (ARIA labels, клавиатурная навигация)
- Анимации и transitions
- Error handling
- Loading states
- Документация

---

## ⏱️ ИТОГОВЫЕ ОЦЕНКИ

### MVP (Минимальный функционал)
```
Фаза 1: Подготовка              2ч
Фаза 2: Базовый календарь       3ч
Фаза 3: Отели                   4ч
Фаза 4: Туры                    4ч
Фаза 5: Трансферы               4ч
Фаза 6: UI компоненты           3ч
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ИТОГО:                         20ч
```

### Полная версия
```
MVP                            20ч
Фаза 7: Формы                   4ч
Фаза 8: API                     3ч
Фаза 9: Тестирование            3ч
Фаза 10: Полировка              3ч
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ИТОГО:                         33ч
```

---

## 🚀 НАЧИНАЕМ СЕГОДНЯ?

### День 1 (Сегодня) - 4-5 часов
- ✅ Установка зависимостей
- ✅ BaseCalendar компонент
- ✅ Базовые стили
- ✅ StayDatePicker (начало)

### День 2 - 4-5 часов
- ✅ StayDatePicker (завершение)
- ✅ API для отелей
- ✅ Тестирование

### День 3 - 4-5 часов
- ✅ TourDatePicker
- ✅ TimeSlotPicker
- ✅ API для туров

### День 4 - 4-5 часов
- ✅ TransferDateTimePicker
- ✅ ScheduleCard
- ✅ API для трансферов

### День 5 - 4-5 часов
- ✅ UI компоненты
- ✅ Формы бронирования
- ✅ Финальная полировка

**Через 5 дней полностью рабочая система! 🎉**

---

## 📊 МЕТРИКИ УСПЕХА

### Технические
- ✅ 100% TypeScript покрытие
- ✅ 80%+ test coverage
- ✅ <300ms время загрузки календаря
- ✅ 0 критических багов

### UX
- ✅ <3 клика до бронирования
- ✅ 100% мобильная адаптация
- ✅ WCAG AA accessibility
- ✅ 90%+ положительные отзывы

### Бизнес
- ✅ +50% конверсия в бронирования
- ✅ -30% отказов на этапе выбора дат
- ✅ +25% среднийчек (за счёт upsell)

---

## 🎯 СЛЕДУЮЩИЙ ШАГ

**Готов начать реализацию ПРЯМО СЕЙЧАС! 🚀**

Начну с установки зависимостей и создания BaseCalendar?

**ИЛИ**

Хотите сначала посмотреть интерактивный прототип в Figma?

**Ваше решение?** 👇



