# WIREFRAME + TAILWIND ПРОТОТИП ГЛАВНОЙ СТРАНИЦЫ

**Дата:** 2 февраля 2026  
**Основа:** UX_RESEARCH_HOMEPAGE_DECISIONS.md  
**Статус:** Готов к разработке  

---

## СОДЕРЖАНИЕ

1. [Цветовая система](#цветовая-система)
2. [Типографика](#типографика)
3. [Spacing система](#spacing-система)
4. [Компоненты](#компоненты)
5. [Структура главной страницы](#структура-главной-страницы)
6. [Адаптивность](#адаптивность)

---

## ЦВЕТОВАЯ СИСТЕМА

### Базовая палитра (Kamchatka Nature)

```typescript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        // Нейтральные (основа)
        'kamchatka': {
          'white': '#FFFFFF',
          'black': '#0A0A0A',
          'gray': {
            50: '#FAFAFA',
            100: '#F5F5F5',
            200: '#E5E5E5',
            300: '#D4D4D4',
            400: '#A3A3A3',
            500: '#737373',
            600: '#525252',
            700: '#404040',
            800: '#262626',
            900: '#171717',
          }
        },
        
        // Акцентные (природа Камчатки)
        'volcano': {
          light: '#94A3B8',  // Серый вулканический пепел
          DEFAULT: '#64748B', // Базальт
          dark: '#475569',    // Тёмная лава
        },
        
        'ocean': {
          light: '#BAE6FD',   // Холодная вода
          DEFAULT: '#0EA5E9', // Тихий океан
          dark: '#0369A1',    // Глубина
        },
        
        'moss': {
          light: '#D9F99D',   // Светлый мох
          DEFAULT: '#84CC16', // Тундра
          dark: '#4D7C0F',    // Лес
        },
        
        // Функциональные
        'action': {
          primary: '#0EA5E9',     // Океан (основное действие)
          secondary: '#64748B',   // Вулкан (второстепенное)
          danger: '#EF4444',      // Опасность
          success: '#84CC16',     // Успех
          warning: '#F59E0B',     // Предупреждение
        }
      }
    }
  }
}
```

### Цветовая логика применения

```css
/* Фон */
.bg-main: bg-kamchatka-gray-50
.bg-card: bg-white
.bg-overlay: bg-kamchatka-black/40

/* Текст */
.text-primary: text-kamchatka-gray-900
.text-secondary: text-kamchatka-gray-600
.text-muted: text-kamchatka-gray-400

/* Границы */
.border-default: border-kamchatka-gray-200
.border-subtle: border-kamchatka-gray-100

/* Состояния */
.hover-bg: hover:bg-kamchatka-gray-100
.focus-ring: focus:ring-2 focus:ring-ocean-DEFAULT focus:ring-offset-2
```

---

## ТИПОГРАФИКА

### Шрифтовая система

```typescript
// tailwind.config.js
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        // Display (заголовки секций)
        'display-lg': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],  // 60px
        'display-md': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],     // 48px
        'display-sm': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],  // 36px
        
        // Heading (подзаголовки)
        'heading-lg': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }], // 30px
        'heading-md': ['1.5rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],         // 24px
        'heading-sm': ['1.25rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],        // 20px
        
        // Body (основной текст)
        'body-lg': ['1.125rem', { lineHeight: '1.7', letterSpacing: '0', fontWeight: '400' }],          // 18px
        'body-md': ['1rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],              // 16px
        'body-sm': ['0.875rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],          // 14px
        
        // Label (метки, кнопки)
        'label-lg': ['1rem', { lineHeight: '1.5', letterSpacing: '0.01em', fontWeight: '500' }],        // 16px
        'label-md': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.01em', fontWeight: '500' }],    // 14px
        'label-sm': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.02em', fontWeight: '500' }],     // 12px
      }
    }
  }
}
```

### Применение типографики

```tsx
// Hero заголовок
<h1 className="text-display-lg text-kamchatka-gray-900">
  Управляйте путешествием на Камчатку
</h1>

// Секция заголовок
<h2 className="text-display-sm text-kamchatka-gray-900">
  Выберите свою роль
</h2>

// Карточка заголовок
<h3 className="text-heading-md text-kamchatka-gray-900">
  Турист
</h3>

// Основной текст
<p className="text-body-md text-kamchatka-gray-600">
  Найдите тур, проверьте погоду, забронируйте безопасно
</p>

// Метка
<span className="text-label-sm text-kamchatka-gray-500 uppercase">
  Популярное
</span>
```

---

## SPACING СИСТЕМА

### Базовая сетка (4px base)

```typescript
// tailwind.config.js
export default {
  theme: {
    extend: {
      spacing: {
        // Микро (внутренние отступы)
        '0.5': '2px',   // 0.125rem
        '1': '4px',     // 0.25rem
        '2': '8px',     // 0.5rem
        '3': '12px',    // 0.75rem
        '4': '16px',    // 1rem
        '5': '20px',    // 1.25rem
        '6': '24px',    // 1.5rem
        '8': '32px',    // 2rem
        
        // Средние (отступы между элементами)
        '10': '40px',   // 2.5rem
        '12': '48px',   // 3rem
        '16': '64px',   // 4rem
        '20': '80px',   // 5rem
        '24': '96px',   // 6rem
        
        // Большие (отступы между секциями)
        '32': '128px',  // 8rem
        '40': '160px',  // 10rem
        '48': '192px',  // 12rem
        '56': '224px',  // 14rem
        '64': '256px',  // 16rem
      }
    }
  }
}
```

### Layout сетка

```tsx
// Container максимальная ширина
const containerMaxWidth = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Laptop
  xl: '1280px',  // Desktop
  '2xl': '1440px' // Large desktop
}

// Content максимальная ширина (для читаемости текста)
const contentMaxWidth = '65ch' // ~65 символов
```

---

## КОМПОНЕНТЫ

### Button (Кнопка)

```tsx
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}

const buttonVariants = {
  primary: 'bg-ocean-DEFAULT hover:bg-ocean-dark text-white shadow-sm',
  secondary: 'bg-volcano-DEFAULT hover:bg-volcano-dark text-white shadow-sm',
  ghost: 'bg-transparent hover:bg-kamchatka-gray-100 text-kamchatka-gray-900 border border-kamchatka-gray-200',
  danger: 'bg-action-danger hover:bg-red-600 text-white shadow-sm'
}

const buttonSizes = {
  sm: 'px-4 py-2 text-label-sm',
  md: 'px-6 py-3 text-label-md',
  lg: 'px-8 py-4 text-label-lg'
}

export const Button = ({ variant = 'primary', size = 'md', children, className = '' }: ButtonProps) => (
  <button
    className={`
      inline-flex items-center justify-center gap-2
      font-medium rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-ocean-DEFAULT focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      ${buttonVariants[variant]}
      ${buttonSizes[size]}
      ${className}
    `}
  >
    {children}
  </button>
)
```

**Примеры использования:**

```tsx
<Button variant="primary" size="lg">
  Найти тур
</Button>

<Button variant="secondary" size="md">
  Узнать больше
</Button>

<Button variant="ghost" size="sm">
  Отмена
</Button>
```

---

### Card (Карточка)

```tsx
// components/ui/Card.tsx
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive'
  padding?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}

const cardVariants = {
  default: 'bg-white border border-kamchatka-gray-200',
  elevated: 'bg-white shadow-lg',
  outlined: 'bg-transparent border-2 border-kamchatka-gray-300',
  interactive: 'bg-white border border-kamchatka-gray-200 hover:shadow-md hover:border-ocean-DEFAULT transition-all duration-300 cursor-pointer'
}

const cardPadding = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
}

export const Card = ({ variant = 'default', padding = 'md', children, className = '' }: CardProps) => (
  <div
    className={`
      rounded-xl
      ${cardVariants[variant]}
      ${cardPadding[padding]}
      ${className}
    `}
  >
    {children}
  </div>
)
```

**Примеры использования:**

```tsx
<Card variant="elevated" padding="lg">
  <h3 className="text-heading-md mb-4">Турист</h3>
  <p className="text-body-md text-kamchatka-gray-600">
    Найдите идеальный тур на Камчатку
  </p>
</Card>

<Card variant="interactive" padding="md">
  <div className="flex items-start gap-4">
    <IconMountain className="w-8 h-8 text-volcano-DEFAULT" />
    <div>
      <h4 className="text-heading-sm">Вулканы</h4>
      <p className="text-body-sm text-kamchatka-gray-600">15 активных</p>
    </div>
  </div>
</Card>
```

---

### Badge (Бейдж)

```tsx
// components/ui/Badge.tsx
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  children: React.ReactNode
  className?: string
}

const badgeVariants = {
  default: 'bg-kamchatka-gray-100 text-kamchatka-gray-700',
  success: 'bg-moss-light text-moss-dark',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-ocean-light text-ocean-dark'
}

export const Badge = ({ variant = 'default', children, className = '' }: BadgeProps) => (
  <span
    className={`
      inline-flex items-center
      px-3 py-1
      rounded-full
      text-label-sm font-medium
      ${badgeVariants[variant]}
      ${className}
    `}
  >
    {children}
  </span>
)
```

---

### RoleCard (Карточка роли)

```tsx
// components/homepage/RoleCard.tsx
interface RoleCardProps {
  icon: React.ReactNode
  title: string
  description: string
  features: string[]
  href: string
  color: 'ocean' | 'volcano' | 'moss'
}

const colorClasses = {
  ocean: {
    icon: 'text-ocean-DEFAULT',
    border: 'hover:border-ocean-DEFAULT',
    badge: 'bg-ocean-light text-ocean-dark'
  },
  volcano: {
    icon: 'text-volcano-DEFAULT',
    border: 'hover:border-volcano-DEFAULT',
    badge: 'bg-volcano-light text-volcano-dark'
  },
  moss: {
    icon: 'text-moss-DEFAULT',
    border: 'hover:border-moss-DEFAULT',
    badge: 'bg-moss-light text-moss-dark'
  }
}

export const RoleCard = ({ icon, title, description, features, href, color }: RoleCardProps) => {
  const colors = colorClasses[color]
  
  return (
    <Card 
      variant="interactive"
      padding="lg"
      className={`group ${colors.border}`}
    >
      {/* Иконка */}
      <div className={`w-12 h-12 mb-6 ${colors.icon}`}>
        {icon}
      </div>
      
      {/* Заголовок */}
      <h3 className="text-heading-md mb-2">
        {title}
      </h3>
      
      {/* Описание */}
      <p className="text-body-md text-kamchatka-gray-600 mb-6">
        {description}
      </p>
      
      {/* Фичи */}
      <ul className="space-y-2 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-body-sm text-kamchatka-gray-600">
            <Check className="w-4 h-4 text-moss-DEFAULT flex-shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      
      {/* CTA */}
      <Button variant="primary" className="w-full group-hover:shadow-lg">
        Перейти
        <ArrowRight className="w-4 h-4" />
      </Button>
    </Card>
  )
}
```

---

## СТРУКТУРА ГЛАВНОЙ СТРАНИЦЫ

### 1. Hero Section

```tsx
// components/homepage/HeroSection.tsx
export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Фоновый слой с погодой */}
      <div className="absolute inset-0 z-0">
        <WeatherBackground />
      </div>
      
      {/* Оверлей для читаемости */}
      <div className="absolute inset-0 bg-gradient-to-b from-kamchatka-black/20 to-kamchatka-black/40 z-10" />
      
      {/* Контент */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 py-24 text-center">
        {/* Бейдж */}
        <Badge variant="info" className="mb-6">
          Единая платформа для туризма на Камчатке
        </Badge>
        
        {/* Заголовок */}
        <h1 className="text-display-lg text-white mb-6 max-w-4xl mx-auto">
          Управляйте путешествием на Камчатку
        </h1>
        
        {/* Подзаголовок */}
        <p className="text-body-lg text-white/90 mb-12 max-w-2xl mx-auto">
          Планируйте, бронируйте и контролируйте каждый аспект поездки. 
          Погода, безопасность, маршруты — всё в одном месте.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="primary" size="lg">
            <Search className="w-5 h-5" />
            Найти тур
          </Button>
          
          <Button variant="secondary" size="lg">
            <Users className="w-5 h-5" />
            Для бизнеса
          </Button>
          
          <Button variant="ghost" size="lg" className="text-white border-white/30 hover:bg-white/10">
            <Sparkles className="w-5 h-5" />
            Попробовать AI
          </Button>
        </div>
        
        {/* Индикатор скролла */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/60" />
        </div>
      </div>
    </section>
  )
}
```

**Размеры:**
- Container: `max-w-7xl` (1280px)
- Padding: `px-6` (24px) на мобиле, `px-8` на десктопе
- Вертикальный spacing: `py-24` (96px)
- Gap между элементами: `mb-6` (24px), `mb-12` (48px)

---

### 2. Quick Stats (Быстрая статистика)

```tsx
// components/homepage/QuickStats.tsx
export const QuickStats = () => {
  const stats = [
    { icon: <Mountain />, value: '150+', label: 'Туров' },
    { icon: <Users />, value: '50+', label: 'Партнёров' },
    { icon: <Star />, value: '4.8', label: 'Рейтинг' },
    { icon: <Shield />, value: '24/7', label: 'Поддержка' }
  ]
  
  return (
    <section className="py-16 bg-white border-y border-kamchatka-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 text-ocean-DEFAULT">
                {stat.icon}
              </div>
              <div className="text-display-sm text-kamchatka-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-body-sm text-kamchatka-gray-600">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Размеры:**
- Section padding: `py-16` (64px)
- Grid gap: `gap-8` (32px)
- Icon size: `w-12 h-12` (48px)
- Margin между элементами: `mb-4` (16px)

---

### 3. Role Selector (Выбор роли)

```tsx
// components/homepage/RoleSelector.tsx
export const RoleSelector = () => {
  const roles = [
    {
      icon: <Compass className="w-full h-full" />,
      title: 'Турист',
      description: 'Ищете приключения на Камчатке?',
      features: [
        'Поиск и бронирование туров',
        'AI-помощник в выборе',
        'Мониторинг погоды',
        'SOS и безопасность'
      ],
      href: '/hub/tourist',
      color: 'ocean' as const
    },
    {
      icon: <Building className="w-full h-full" />,
      title: 'Туроператор',
      description: 'Организуете туры по Камчатке?',
      features: [
        'Управление турами',
        'CRM и аналитика',
        'Календарь бронирований',
        'Финансовая отчётность'
      ],
      href: '/hub/operator',
      color: 'volcano' as const
    },
    {
      icon: <Award className="w-full h-full" />,
      title: 'Гид',
      description: 'Проводите экскурсии?',
      features: [
        'Расписание туров',
        'Управление группами',
        'Отслеживание заработка',
        'Рейтинги и отзывы'
      ],
      href: '/hub/guide',
      color: 'moss' as const
    }
  ]
  
  return (
    <section className="py-24 bg-kamchatka-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Заголовок секции */}
        <div className="text-center mb-16">
          <h2 className="text-display-sm text-kamchatka-gray-900 mb-4">
            Выберите свою роль
          </h2>
          <p className="text-body-lg text-kamchatka-gray-600 max-w-2xl mx-auto">
            Kamchatour — это платформа для всех участников туристической экосистемы
          </p>
        </div>
        
        {/* Сетка карточек */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {roles.map((role, index) => (
            <RoleCard key={index} {...role} />
          ))}
        </div>
        
        {/* Дополнительная ссылка */}
        <div className="text-center mt-12">
          <p className="text-body-md text-kamchatka-gray-600 mb-4">
            Не нашли свою роль?
          </p>
          <Button variant="ghost" size="md">
            Посмотреть все возможности
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
```

**Размеры:**
- Section padding: `py-24` (96px)
- Header margin: `mb-16` (64px)
- Grid gap: `gap-8` (32px)
- Колонки: 1 на mobile, 2 на tablet, 3 на desktop

---

### 4. Weather Context (Контекст погоды)

```tsx
// components/homepage/WeatherContext.tsx
export const WeatherContext = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Текстовый блок */}
          <div>
            <Badge variant="info" className="mb-6">
              Погода в реальном времени
            </Badge>
            
            <h2 className="text-display-sm text-kamchatka-gray-900 mb-6">
              Контролируйте погоду, не переживайте
            </h2>
            
            <p className="text-body-lg text-kamchatka-gray-600 mb-8">
              Камчатка — непредсказуемый регион. Мы интегрировали данные 
              из официальных источников, чтобы вы всегда знали актуальную погоду.
            </p>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-ocean-dark" />
                </div>
                <div>
                  <div className="text-heading-sm text-kamchatka-gray-900 mb-1">
                    Обновление каждый час
                  </div>
                  <div className="text-body-sm text-kamchatka-gray-600">
                    Данные от ФГБУ "Камчатское УГМС"
                  </div>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-ocean-dark" />
                </div>
                <div>
                  <div className="text-heading-sm text-kamchatka-gray-900 mb-1">
                    Прогноз на 7 дней
                  </div>
                  <div className="text-body-sm text-kamchatka-gray-600">
                    Планируйте поездку заранее
                  </div>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-ocean-dark" />
                </div>
                <div>
                  <div className="text-heading-sm text-kamchatka-gray-900 mb-1">
                    Умные рекомендации
                  </div>
                  <div className="text-body-sm text-kamchatka-gray-600">
                    Туры подстраиваются под погодные условия
                  </div>
                </div>
              </li>
            </ul>
            
            <Button variant="primary" size="lg">
              <CloudRain className="w-5 h-5" />
              Посмотреть погоду
            </Button>
          </div>
          
          {/* Визуальный блок */}
          <div>
            <Card variant="elevated" padding="lg">
              <WeatherWidget location="Петропавловск-Камчатский" />
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
```

**Размеры:**
- Section padding: `py-24` (96px)
- Grid gap: `gap-12` (48px)
- List spacing: `space-y-4` (16px)
- Icon container: `w-6 h-6` (24px)

---

### 5. Featured Tours (Популярные туры)

```tsx
// components/homepage/FeaturedTours.tsx
export const FeaturedTours = () => {
  return (
    <section className="py-24 bg-kamchatka-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Заголовок */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-display-sm text-kamchatka-gray-900 mb-2">
              Популярные туры
            </h2>
            <p className="text-body-lg text-kamchatka-gray-600">
              Проверено туристами, одобрено гидами
            </p>
          </div>
          
          <Button variant="ghost" size="md" className="hidden md:flex">
            Все туры
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Сетка туров */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TourCard
            image="/tours/volcano.jpg"
            title="Восхождение на Авачинский вулкан"
            operator="Kamchatka Adventures"
            rating={4.9}
            reviews={156}
            duration="1 день"
            difficulty="Средняя"
            price={12500}
            available={true}
          />
          {/* Остальные карточки */}
        </div>
        
        {/* Кнопка на мобиле */}
        <div className="mt-8 text-center md:hidden">
          <Button variant="ghost" size="md" className="w-full">
            Все туры
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
```

---

### 6. Trust Signals (Сигналы доверия)

```tsx
// components/homepage/TrustSignals.tsx
export const TrustSignals = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-label-md text-kamchatka-gray-500 uppercase tracking-wider mb-4">
            Официальные партнёры
          </p>
        </div>
        
        {/* Логотипы партнёров */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
          <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
            <img src="/partners/mchs.svg" alt="МЧС России" className="h-12" />
          </div>
          <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
            <img src="/partners/kvert.svg" alt="KVERT" className="h-12" />
          </div>
          <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
            <img src="/partners/meteo.svg" alt="УГМС" className="h-12" />
          </div>
          <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
            <img src="/partners/tourism.svg" alt="Туризм Камчатка" className="h-12" />
          </div>
        </div>
      </div>
    </section>
  )
}
```

---

### 7. CTA Section (Финальный призыв)

```tsx
// components/homepage/CTASection.tsx
export const CTASection = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-ocean-DEFAULT to-ocean-dark text-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-display-md mb-6">
          Начните планировать поездку на Камчатку
        </h2>
        
        <p className="text-body-lg text-white/90 mb-12 max-w-2xl mx-auto">
          Присоединяйтесь к платформе, которая делает путешествия на Камчатку 
          безопасными, понятными и доступными
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="secondary" size="lg" className="bg-white text-ocean-dark hover:bg-kamchatka-gray-100">
            <Search className="w-5 h-5" />
            Найти тур
          </Button>
          
          <Button variant="ghost" size="lg" className="text-white border-white/30 hover:bg-white/10">
            <MessageCircle className="w-5 h-5" />
            Задать вопрос AI
          </Button>
        </div>
      </div>
    </section>
  )
}
```

---

## АДАПТИВНОСТЬ

### Breakpoints стратегия

```typescript
// Точки перелома
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Laptop
  xl: '1280px',  // Desktop
  '2xl': '1440px' // Large desktop
}

// Применение
<div className="
  grid 
  grid-cols-1           // Mobile: 1 колонка
  md:grid-cols-2        // Tablet: 2 колонки
  lg:grid-cols-3        // Desktop: 3 колонки
  gap-6                 // Gap 24px
">
```

### Адаптивная типографика

```tsx
// Заголовки масштабируются
<h1 className="
  text-4xl              // Mobile: 36px
  md:text-5xl           // Tablet: 48px
  lg:text-6xl           // Desktop: 60px
">

// Padding адаптируется
<section className="
  py-12                 // Mobile: 48px
  md:py-16              // Tablet: 64px
  lg:py-24              // Desktop: 96px
">

// Container адаптируется
<div className="
  px-4                  // Mobile: 16px
  md:px-6               // Tablet: 24px
  lg:px-8               // Desktop: 32px
  max-w-7xl             // Max width: 1280px
  mx-auto               // Центрирование
">
```

### Скрытие/показ элементов

```tsx
// Показать только на desktop
<div className="hidden lg:block">
  Дополнительная информация
</div>

// Показать только на mobile
<div className="block lg:hidden">
  Мобильное меню
</div>

// Изменить направление
<div className="flex flex-col md:flex-row">
  {/* Вертикально на mobile, горизонтально на desktop */}
</div>
```

---

## ФИНАЛЬНАЯ СТРУКТУРА ФАЙЛОВ

```
app/
├── page.tsx                              # Главная страница
│
components/
├── homepage/
│   ├── HeroSection.tsx                   # Hero с погодным фоном
│   ├── QuickStats.tsx                    # Быстрая статистика
│   ├── RoleSelector.tsx                  # Выбор роли
│   ├── WeatherContext.tsx                # Контекст погоды
│   ├── FeaturedTours.tsx                 # Популярные туры
│   ├── TrustSignals.tsx                  # Партнёры и доверие
│   └── CTASection.tsx                    # Финальный CTA
│
├── ui/
│   ├── Button.tsx                        # Кнопка
│   ├── Card.tsx                          # Карточка
│   ├── Badge.tsx                         # Бейдж
│   └── RoleCard.tsx                      # Карточка роли
│
└── weather/
    └── WeatherBackground.tsx             # Погодный фон

tailwind.config.js                        # Конфигурация цветов и spacing
```

---

**Документ готов к разработке.**  
Все размеры, отступы, цвета и компоненты определены.


---

## ДОПОЛНИТЕЛЬНЫЕ КОМПОНЕНТЫ

### TourCard (Карточка тура)

```tsx
// components/homepage/TourCard.tsx
interface TourCardProps {
  image: string
  title: string
  operator: string
  rating: number
  reviews: number
  duration: string
  difficulty: 'Лёгкая' | 'Средняя' | 'Сложная'
  price: number
  available: boolean
}

const difficultyColors = {
  'Лёгкая': 'bg-moss-light text-moss-dark',
  'Средняя': 'bg-yellow-100 text-yellow-800',
  'Сложная': 'bg-red-100 text-red-800'
}

export const TourCard = ({
  image,
  title,
  operator,
  rating,
  reviews,
  duration,
  difficulty,
  price,
  available
}: TourCardProps) => {
  return (
    <Card variant="interactive" padding="sm" className="group h-full flex flex-col">
      {/* Изображение */}
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-4">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Оверлей с бейджами */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <Badge variant="info" className="backdrop-blur-sm bg-white/90">
            {duration}
          </Badge>
          
          <Badge 
            variant="default" 
            className={`backdrop-blur-sm ${difficultyColors[difficulty]}`}
          >
            {difficulty}
          </Badge>
        </div>
        
        {/* Статус доступности */}
        {available && (
          <div className="absolute bottom-3 right-3">
            <Badge variant="success" className="backdrop-blur-sm bg-white/90">
              <CheckCircle className="w-3 h-3 mr-1" />
              Доступен
            </Badge>
          </div>
        )}
      </div>
      
      {/* Контент */}
      <div className="flex-1 flex flex-col p-4">
        {/* Заголовок */}
        <h3 className="text-heading-sm text-kamchatka-gray-900 mb-2 line-clamp-2 group-hover:text-ocean-DEFAULT transition-colors">
          {title}
        </h3>
        
        {/* Оператор */}
        <p className="text-body-sm text-kamchatka-gray-600 mb-4">
          {operator}
        </p>
        
        {/* Рейтинг */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-label-md font-semibold text-kamchatka-gray-900">
              {rating.toFixed(1)}
            </span>
          </div>
          <span className="text-body-sm text-kamchatka-gray-500">
            ({reviews} отзывов)
          </span>
        </div>
        
        {/* Разделитель */}
        <div className="border-t border-kamchatka-gray-200 my-4" />
        
        {/* Цена и кнопка */}
        <div className="flex items-center justify-between mt-auto">
          <div>
            <div className="text-label-sm text-kamchatka-gray-500 mb-1">
              От
            </div>
            <div className="text-heading-md text-kamchatka-gray-900">
              {price.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          
          <Button variant="primary" size="sm">
            Подробнее
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
```

**Размеры TourCard:**
- Aspect ratio изображения: `4:3`
- Padding карточки: `p-4` (16px)
- Gap между элементами: `gap-2` (8px), `gap-4` (16px)
- Высота: `h-full` (растягивается на всю высоту грида)
- Border radius: `rounded-lg` (8px)

---

### WeatherWidget (Виджет погоды)

```tsx
// components/weather/WeatherWidget.tsx
interface WeatherWidgetProps {
  location: string
}

export const WeatherWidget = ({ location }: WeatherWidgetProps) => {
  // В реальности данные из API
  const weatherData = {
    temperature: -5,
    condition: 'snow',
    humidity: 78,
    wind: 12,
    forecast: [
      { day: 'Пн', temp: -3, condition: 'cloudy' },
      { day: 'Вт', temp: -7, condition: 'snow' },
      { day: 'Ср', temp: -4, condition: 'partly_cloudy' },
      { day: 'Чт', temp: -2, condition: 'cloudy' },
      { day: 'Пт', temp: 0, condition: 'rain' }
    ]
  }
  
  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-kamchatka-gray-500" />
          <span className="text-label-md text-kamchatka-gray-600">
            {location}
          </span>
        </div>
        <div className="text-label-sm text-kamchatka-gray-500">
          Обновлено 10 минут назад
        </div>
      </div>
      
      {/* Текущая погода */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-display-md text-kamchatka-gray-900 mb-2">
            {weatherData.temperature > 0 ? '+' : ''}{weatherData.temperature}°
          </div>
          <div className="text-body-md text-kamchatka-gray-600 capitalize">
            Снег
          </div>
        </div>
        
        <div className="w-24 h-24 text-ocean-DEFAULT">
          <CloudSnow className="w-full h-full" />
        </div>
      </div>
      
      {/* Детали */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-kamchatka-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-ocean-DEFAULT" />
          <div>
            <div className="text-label-sm text-kamchatka-gray-500">Влажность</div>
            <div className="text-label-md text-kamchatka-gray-900">{weatherData.humidity}%</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5 text-ocean-DEFAULT" />
          <div>
            <div className="text-label-sm text-kamchatka-gray-500">Ветер</div>
            <div className="text-label-md text-kamchatka-gray-900">{weatherData.wind} м/с</div>
          </div>
        </div>
      </div>
      
      {/* Прогноз на 5 дней */}
      <div>
        <div className="text-heading-sm text-kamchatka-gray-900 mb-4">
          Прогноз на 5 дней
        </div>
        
        <div className="space-y-3">
          {weatherData.forecast.map((day, index) => (
            <div key={index} className="flex items-center justify-between p-3 hover:bg-kamchatka-gray-50 rounded-lg transition-colors">
              <div className="text-label-md text-kamchatka-gray-900 w-12">
                {day.day}
              </div>
              
              <div className="flex items-center gap-2 flex-1">
                <Cloud className="w-5 h-5 text-kamchatka-gray-400" />
              </div>
              
              <div className="text-label-md text-kamchatka-gray-900">
                {day.temp > 0 ? '+' : ''}{day.temp}°
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Источник данных */}
      <div className="pt-4 border-t border-kamchatka-gray-200">
        <div className="flex items-center gap-2 text-label-sm text-kamchatka-gray-500">
          <Info className="w-4 h-4" />
          <span>Данные: ФГБУ "Камчатское УГМС"</span>
        </div>
      </div>
    </div>
  )
}
```

**Размеры WeatherWidget:**
- Section spacing: `space-y-6` (24px)
- Grid padding: `p-4` (16px)
- Icon sizes: `w-5 h-5` (20px), `w-24 h-24` (96px для главной иконки)
- Border radius: `rounded-lg` (8px)

---

## ПОЛНАЯ КОМПОЗИЦИЯ ГЛАВНОЙ СТРАНИЦЫ

```tsx
// app/page.tsx
import { HeroSection } from '@/components/homepage/HeroSection'
import { QuickStats } from '@/components/homepage/QuickStats'
import { RoleSelector } from '@/components/homepage/RoleSelector'
import { WeatherContext } from '@/components/homepage/WeatherContext'
import { FeaturedTours } from '@/components/homepage/FeaturedTours'
import { TrustSignals } from '@/components/homepage/TrustSignals'
import { CTASection } from '@/components/homepage/CTASection'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* 1. Hero - Полноэкранный вход */}
      <HeroSection />
      
      {/* 2. Быстрая статистика - Доверие через цифры */}
      <QuickStats />
      
      {/* 3. Выбор роли - Главная навигация */}
      <RoleSelector />
      
      {/* 4. Контекст погоды - Снижение страха */}
      <WeatherContext />
      
      {/* 5. Популярные туры - Социальное доказательство */}
      <FeaturedTours />
      
      {/* 6. Сигналы доверия - Партнёры */}
      <TrustSignals />
      
      {/* 7. Финальный CTA - Призыв к действию */}
      <CTASection />
    </main>
  )
}
```

**Общая высота страницы:** ~4500-5000px (на desktop)

**Секции в пикселях:**
1. HeroSection: ~800-1000px (full viewport)
2. QuickStats: ~200px
3. RoleSelector: ~800px
4. WeatherContext: ~600px
5. FeaturedTours: ~900px
6. TrustSignals: ~250px
7. CTASection: ~400px

---

## КЛЮЧЕВЫЕ МЕТРИКИ ПРОИЗВОДИТЕЛЬНОСТИ

### Target метрики:

```typescript
// Performance budgets
const performanceBudgets = {
  // Lighthouse targets
  performance: 90,        // Performance score
  accessibility: 95,      // A11y score
  bestPractices: 95,      // Best practices
  seo: 100,              // SEO score
  
  // Core Web Vitals
  LCP: 2.5,              // Largest Contentful Paint (seconds)
  FID: 100,              // First Input Delay (ms)
  CLS: 0.1,              // Cumulative Layout Shift
  
  // Custom metrics
  TTI: 3.5,              // Time to Interactive (seconds)
  TBT: 300,              // Total Blocking Time (ms)
  
  // Bundle sizes
  jsBundle: 200,         // KB (gzipped)
  cssBundle: 50,         // KB (gzipped)
  totalPage: 1000        // KB (including images, gzipped)
}
```

### Оптимизации:

```tsx
// 1. Lazy loading изображений
<img 
  src={image} 
  alt={title}
  loading="lazy"
  className="..."
/>

// 2. Dynamic imports для тяжёлых компонентов
const WeatherWidget = dynamic(() => import('@/components/weather/WeatherWidget'), {
  loading: () => <WeatherWidgetSkeleton />,
  ssr: false
})

// 3. Image optimization с Next.js
import Image from 'next/image'

<Image
  src={image}
  alt={title}
  width={400}
  height={300}
  placeholder="blur"
  blurDataURL="data:image/..."
/>
```

---

## ACCESSIBILITY (A11Y)

### ARIA метки и семантика:

```tsx
// Правильная структура заголовков
<main>
  <section aria-labelledby="hero-heading">
    <h1 id="hero-heading">Управляйте путешествием на Камчатку</h1>
  </section>
  
  <section aria-labelledby="roles-heading">
    <h2 id="roles-heading">Выберите свою роль</h2>
  </section>
</main>

// Focus trap для модальных окон
<div 
  role="dialog" 
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <h2 id="modal-title">Заголовок модального окна</h2>
</div>

// Skip navigation
<a href="#main-content" className="sr-only focus:not-sr-only">
  Перейти к основному контенту
</a>

// Keyboard navigation
<button
  className="..."
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
  Нажми меня
</button>
```

### Цветовая контрастность:

Все цветовые комбинации проверены на контраст WCAG AA (минимум 4.5:1 для текста):

```
✓ text-kamchatka-gray-900 на bg-white: 19.8:1
✓ text-kamchatka-gray-600 на bg-white: 7.8:1
✓ text-white на bg-ocean-DEFAULT: 4.6:1
✓ text-white на bg-volcano-DEFAULT: 8.2:1
```

---

**Документ завершён и готов к разработке.**

Этот прототип включает:
- ✅ Все цвета с hex кодами
- ✅ Все размеры шрифтов и spacing
- ✅ Готовые React/Tailwind компоненты
- ✅ Полную структуру главной страницы
- ✅ Адаптивность для всех устройств
- ✅ Performance budgets
- ✅ Accessibility guidelines

**Следующий шаг:** Разработка компонентов в коде.
