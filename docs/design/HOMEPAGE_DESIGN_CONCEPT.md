# 🎨 КОНЦЕПЦИЯ ДИЗАЙНА ГЛАВНОЙ СТРАНИЦЫ - KAMCHATOUR HUB

**Дата:** 2025-11-12  
**Версия:** 2.0 (Revolutionary)  
**Статус:** Design Concept

---

## 📊 EXECUTIVE SUMMARY

Новая главная страница должна:
- ✅ Отражать **премиальность** платформы (Black & Gold)
- ✅ Показать **все 6 ролей** пользователей
- ✅ Визуализировать **экосистему** (не просто каталог туров)
- ✅ Интегрировать **AI, погоду, безопасность** естественно
- ✅ Конвертировать посетителей в **конкретные роли**

---

## 🎯 1. ПРОБЛЕМЫ ТЕКУЩЕГО ДИЗАЙНА

### Текущая версия (`app/page.tsx`):

❌ **Проблема 1:** Фокус только на туристах  
- Показываем туры, погоду, eco-points
- Но не показываем возможности для операторов, гидов, агентов

❌ **Проблема 2:** Не видно экосистемы  
- Выглядит как обычный туристический сайт
- Не понятно, что это платформа для всех

❌ **Проблема 3:** Мало визуальной иерархии  
- Все секции одинакового веса
- Нет четкого пути для разных типов пользователей

❌ **Проблема 4:** Hero section перегружен  
- Видео + поиск + кнопки + текст = много всего

---

## 🎨 2. НОВАЯ КОНЦЕПЦИЯ: "ECOSYSTEM HUB"

### 2.1 Философия дизайна

**Главная идея:** Показать, что Kamchatour - это **не сайт, а экосистема**

**Визуальная метафора:**
- Центр = Hub (ядро)
- От центра расходятся 6 секторов (роли)
- Все связано, все работает вместе

**Tone of Voice:**
- Премиальный, но доступный
- Профессиональный, но дружелюбный
- Инновационный, но надежный

---

## 📐 3. СТРУКТУРА НОВОЙ ГЛАВНОЙ СТРАНИЦЫ

### Карта секций:

```
┌─────────────────────────────────────────────────────────────┐
│  1. HERO SECTION (Revolutionary)                            │
│     - Полноэкранное видео + Interactive Hub Graphic         │
│     - Главный посыл: "Экосистема туризма Камчатки"          │
│     - Анимированная схема с 6 ролями                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  2. VALUE PROPOSITION (3 колонки)                           │
│     [Для туристов] [Для бизнеса] [Для партнеров]           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  3. ROLE SELECTOR (Interactive)                             │
│     "Кто вы?" - 6 крупных карточек с ролями                 │
│     При наведении - разворачивается описание + кнопка       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  4. LIVE ECOSYSTEM (Real-time Dashboard)                    │
│     - Последние туры                                        │
│     - Активные трансферы                                    │
│     - Погода                                                │
│     - Статистика платформы                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  5. FEATURED TOURS (Carousel)                               │
│     Топовые туры с фото, рейтингами, ценами                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  6. AI ASSISTANT (Interactive Demo)                         │
│     "Попробуйте AI-помощника прямо сейчас"                  │
│     Embedded chat с примерами вопросов                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  7. SAFETY & ECO (Split Screen)                             │
│     [SOS & Безопасность]  |  [Eco-points & Экология]       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  8. TESTIMONIALS (Reviews Carousel)                         │
│     Отзывы от всех типов пользователей                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  9. PLATFORM STATS (Animated Counters)                      │
│     - 100+ туров  - 50+ партнеров  - 1000+ туристов        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  10. CTA SECTION (Final Push)                               │
│      "Готовы начать? Выберите свою роль"                    │
│      6 кнопок → прямо в dashboards                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎬 4. ДЕТАЛЬНЫЙ ДИЗАЙН СЕКЦИЙ

### 4.1 HERO SECTION (Revolutionary Redesign)

**Концепция:** Полноэкранный интерактивный хаб

```typescript
<HeroSection>
  {/* Background */}
  <video 
    src="kamchatka_volcano_timelapse.mp4" 
    loop muted autoPlay 
    className="absolute inset-0 object-cover opacity-40"
  />
  
  {/* Center Hub Graphic (SVG Animation) */}
  <div className="ecosystem-hub">
    <div className="hub-center">
      <img src="/logo.svg" className="w-32 h-32" />
      <h1>KAMCHATOUR HUB</h1>
    </div>
    
    {/* 6 Orbiting Roles */}
    <RoleOrbit role="tourist" angle={0} />
    <RoleOrbit role="operator" angle={60} />
    <RoleOrbit role="guide" angle={120} />
    <RoleOrbit role="transfer" angle={180} />
    <RoleOrbit role="agent" angle={240} />
    <RoleOrbit role="admin" angle={300} />
  </div>
  
  {/* Main Headline */}
  <h1 className="hero-title">
    Экосистема туризма <span className="text-gold">Камчатки</span>
  </h1>
  
  <p className="hero-subtitle">
    Единая платформа для туристов, операторов, гидов, 
    трансферов, агентов и администраторов
  </p>
  
  {/* CTAs */}
  <div className="hero-actions">
    <Button size="xl" variant="gold">
      Найти тур 🏔️
    </Button>
    <Button size="xl" variant="outline">
      Стать партнером 🤝
    </Button>
    <Button size="xl" variant="ghost">
      Попробовать демо ✨
    </Button>
  </div>
  
  {/* Scroll Indicator */}
  <div className="scroll-indicator">
    <span>Листайте вниз</span>
    <ChevronDown className="animate-bounce" />
  </div>
</HeroSection>
```

**Анимация:**
- Роли вращаются вокруг центра (медленно)
- При наведении на роль - она подсвечивается
- Клик на роль → скролл к соответствующей секции

**Цветовая схема:**
- Фон: `#0a0a0a` (premium black)
- Текст: `#ffffff`
- Акценты: `#d4af37` (gold)
- Орбиты: `rgba(212, 175, 55, 0.2)`

---

### 4.2 VALUE PROPOSITION (3 Pillars)

**Концепция:** Три основные ценности платформы

```typescript
<ValueProposition>
  <div className="grid grid-cols-3 gap-8">
    {/* Pillar 1: Для туристов */}
    <Card className="value-card">
      <Icon name="compass" size={64} className="text-blue-400" />
      <h3>Для путешественников</h3>
      <ul>
        <li>✅ 100+ туров по Камчатке</li>
        <li>✅ AI-помощник в выборе</li>
        <li>✅ Реальные отзывы</li>
        <li>✅ Безопасность 24/7</li>
        <li>✅ Система лояльности</li>
      </ul>
      <Button variant="primary" className="mt-4">
        Найти тур →
      </Button>
    </Card>
    
    {/* Pillar 2: Для бизнеса */}
    <Card className="value-card gold-border">
      <Icon name="building" size={64} className="text-gold" />
      <h3>Для туроператоров</h3>
      <ul>
        <li>✅ Автоматизация бронирований</li>
        <li>✅ CRM и аналитика</li>
        <li>✅ Календарь и расписание</li>
        <li>✅ Финансовая статистика</li>
        <li>✅ Управление гидами</li>
      </ul>
      <Button variant="gold" className="mt-4">
        Стать оператором →
      </Button>
    </Card>
    
    {/* Pillar 3: Для партнеров */}
    <Card className="value-card">
      <Icon name="users" size={64} className="text-green-400" />
      <h3>Для партнеров</h3>
      <ul>
        <li>✅ Трансферы и логистика</li>
        <li>✅ Гиды и экскурсии</li>
        <li>✅ Агентская сеть</li>
        <li>✅ Реферальная программа</li>
        <li>✅ Комиссионные</li>
      </ul>
      <Button variant="primary" className="mt-4">
        Узнать больше →
      </Button>
    </Card>
  </div>
</ValueProposition>
```

**Дизайн:**
- Карточки на премиальном черном фоне
- Золотая рамка на средней карточке (акцент)
- Иконки - крупные, flat design
- Списки - четкие, с галочками

---

### 4.3 ROLE SELECTOR (Interactive Hub)

**Концепция:** Интерактивный выбор роли

```typescript
<RoleSelector>
  <h2 className="section-title">
    Кто вы? <span className="text-gold">Выберите роль</span>
  </h2>
  
  <div className="roles-grid">
    {roles.map(role => (
      <RoleCard 
        key={role.id}
        role={role}
        onHover={(expanded) => setExpanded(role.id)}
        onClick={() => router.push(role.dashboardUrl)}
      >
        <div className="role-icon">
          {role.icon}
        </div>
        <h3>{role.name}</h3>
        <p className="role-short-desc">{role.shortDesc}</p>
        
        {/* Expanded content (on hover) */}
        {expanded === role.id && (
          <div className="role-details">
            <ul>
              {role.features.map(f => (
                <li key={f}>✅ {f}</li>
              ))}
            </ul>
            <Button variant="gold" className="mt-4">
              Войти как {role.name} →
            </Button>
          </div>
        )}
      </RoleCard>
    ))}
  </div>
</RoleSelector>
```

**6 Ролей:**

1. **🧳 ТУРИСТ**
   - Icon: Compass
   - Color: Blue (#3B82F6)
   - Short Desc: "Ищете приключения на Камчатке?"
   - Features: ["Поиск туров", "AI-помощник", "Бронирование", "Отзывы"]

2. **🎯 ТУРОПЕРАТОР**
   - Icon: Building
   - Color: Gold (#d4af37)
   - Short Desc: "Организуете туры по Камчатке?"
   - Features: ["Управление турами", "CRM", "Аналитика", "Финансы"]

3. **🎓 ГИД**
   - Icon: Award
   - Color: Green (#10B981)
   - Short Desc: "Проводите туры по Камчатке?"
   - Features: ["Расписание", "Группы", "Заработок", "Рейтинг"]

4. **🚗 ТРАНСФЕР ОПЕРАТОР**
   - Icon: Truck
   - Color: Purple (#8B5CF6)
   - Short Desc: "Предоставляете трансферы?"
   - Features: ["Автопарк", "Водители", "Маршруты", "Бронирования"]

5. **🎫 АГЕНТ**
   - Icon: Users
   - Color: Orange (#F59E0B)
   - Short Desc: "Продаете туры за комиссию?"
   - Features: ["Клиенты", "Ваучеры", "Комиссионные", "Статистика"]

6. **👨‍💼 АДМИНИСТРАТОР**
   - Icon: Shield
   - Color: Red (#EF4444)
   - Short Desc: "Управляете платформой?"
   - Features: ["Пользователи", "Модерация", "Финансы", "Настройки"]

**Анимация:**
- При наведении карточка расширяется (height: auto)
- Другие карточки слегка уменьшаются (scale: 0.95)
- Плавная трансформация (transition: all 0.3s ease)

---

### 4.4 LIVE ECOSYSTEM (Real-time Dashboard)

**Концепция:** Показать живую платформу

```typescript
<LiveEcosystem>
  <h2 className="section-title">
    Платформа в <span className="text-gold">реальном времени</span>
  </h2>
  
  <div className="ecosystem-grid">
    {/* Column 1: Latest Tours */}
    <div className="ecosystem-card">
      <h3>🏔️ Новые туры</h3>
      <div className="live-list">
        {latestTours.map(tour => (
          <div key={tour.id} className="live-item">
            <img src={tour.image} className="w-12 h-12 rounded" />
            <div>
              <p className="font-bold">{tour.name}</p>
              <p className="text-sm text-gray-400">{tour.price} ₽</p>
            </div>
            <Badge>{tour.operator}</Badge>
          </div>
        ))}
      </div>
    </div>
    
    {/* Column 2: Weather Widget */}
    <div className="ecosystem-card">
      <h3>🌦️ Погода</h3>
      <WeatherWidget 
        location="Петропавловск-Камчатский"
        compact={true}
      />
    </div>
    
    {/* Column 3: Active Transfers */}
    <div className="ecosystem-card">
      <h3>🚗 Активные трансферы</h3>
      <div className="live-map">
        <Map 
          markers={activeTransfers}
          height={300}
        />
      </div>
    </div>
    
    {/* Column 4: Platform Stats */}
    <div className="ecosystem-card gold-gradient">
      <h3>📊 Статистика</h3>
      <div className="stats-grid">
        <Stat label="Туров" value={stats.tours} icon="🏔️" />
        <Stat label="Партнеров" value={stats.partners} icon="🤝" />
        <Stat label="Бронирований" value={stats.bookings} icon="📅" />
        <Stat label="Туристов" value={stats.tourists} icon="🧳" />
      </div>
    </div>
  </div>
</LiveEcosystem>
```

**Ключевые фичи:**
- Данные обновляются каждые 30 секунд
- Animated counters (считалки)
- Live badge ("🔴 LIVE" indicator)

---

### 4.5 FEATURED TOURS (Premium Carousel)

**Концепция:** Showcase лучших туров

```typescript
<FeaturedTours>
  <h2 className="section-title">
    Топовые <span className="text-gold">туры</span>
  </h2>
  
  <Carousel 
    autoPlay={true}
    interval={5000}
    showDots={true}
    showArrows={true}
  >
    {featuredTours.map(tour => (
      <TourCardPremium 
        key={tour.id}
        tour={tour}
        size="xl"
        showOperator={true}
        showWeather={true}
        showAvailability={true}
      />
    ))}
  </Carousel>
  
  <div className="text-center mt-8">
    <Button variant="gold" size="lg">
      Смотреть все туры (100+) →
    </Button>
  </div>
</FeaturedTours>
```

**TourCardPremium design:**
```typescript
<div className="tour-card-premium">
  {/* Image with gradient overlay */}
  <div className="tour-image">
    <img src={tour.image} alt={tour.name} />
    <div className="gradient-overlay"></div>
    <Badge className="tour-badge">{tour.difficulty}</Badge>
    <Badge className="tour-badge-price">{tour.price} ₽</Badge>
  </div>
  
  {/* Content */}
  <div className="tour-content">
    <h3 className="tour-title">{tour.name}</h3>
    <p className="tour-description">{tour.shortDesc}</p>
    
    {/* Operator */}
    <div className="tour-operator">
      <img src={tour.operator.logo} className="w-8 h-8 rounded-full" />
      <span>{tour.operator.name}</span>
      <Stars rating={tour.operator.rating} />
    </div>
    
    {/* Meta info */}
    <div className="tour-meta">
      <span>⏱️ {tour.duration}</span>
      <span>👥 {tour.groupSize} чел</span>
      <span>⭐ {tour.rating}</span>
    </div>
    
    {/* Weather suitability */}
    <div className="tour-weather">
      <WeatherIcon condition={currentWeather} />
      <span className="text-green-400">
        ✅ Подходит для текущей погоды
      </span>
    </div>
    
    {/* CTA */}
    <Button variant="gold" fullWidth>
      Забронировать →
    </Button>
  </div>
</div>
```

---

### 4.6 AI ASSISTANT (Interactive Demo)

**Концепция:** Живое демо AI-помощника

```typescript
<AIAssistantSection>
  <div className="ai-section-layout">
    {/* Left: Description */}
    <div className="ai-description">
      <h2>
        AI-помощник <span className="text-gold">по Камчатке</span>
      </h2>
      <p>
        Наш AI-помощник знает всё о Камчатке и поможет выбрать 
        идеальный тур под ваши предпочтения.
      </p>
      <ul className="ai-features">
        <li>✅ Бесплатно, без регистрации</li>
        <li>✅ Персональные рекомендации</li>
        <li>✅ Ответы на любые вопросы</li>
        <li>✅ Актуальная погода и безопасность</li>
      </ul>
      
      <div className="ai-powered-by">
        <span>Powered by</span>
        <Badge variant="gold">GROQ AI (Llama 3.1)</Badge>
      </div>
    </div>
    
    {/* Right: Live Chat Demo */}
    <div className="ai-chat-demo">
      <AIChatWidget 
        userId="demo"
        height={500}
        showExamples={true}
        exampleQuestions={[
          "Какие туры подойдут для новичков?",
          "Лучшее время для восхождения на вулкан?",
          "Что взять с собой на Камчатку?",
          "Где увидеть медведей безопасно?"
        ]}
      />
    </div>
  </div>
</AIAssistantSection>
```

**Ключевые фичи:**
- Пример вопросов (chips) - кликабельные
- Typing indicator когда AI "думает"
- Markdown поддержка в ответах
- Code highlighting для технических деталей

---

### 4.7 SAFETY & ECO (Split Hero)

**Концепция:** Две важные темы рядом

```typescript
<SafetyEcoSection>
  <div className="split-hero">
    {/* Left: Safety */}
    <div className="safety-half">
      <div className="content-overlay">
        <h2>🆘 Безопасность</h2>
        <p>
          Ваша безопасность - наш приоритет. 
          SOS, МЧС, сейсмика - всё в одном месте.
        </p>
        
        <div className="safety-features">
          <FeatureCard icon="🚨" title="SOS кнопка" />
          <FeatureCard icon="🏔️" title="МЧС Камчатка" />
          <FeatureCard icon="📡" title="Сейсмомониторинг" />
          <FeatureCard icon="🌋" title="Вулканы онлайн" />
        </div>
        
        <Button variant="gold" size="lg">
          Узнать больше →
        </Button>
      </div>
      
      {/* Background: Kamchatka map */}
      <img 
        src="/graphics/kamchatka-button.svg" 
        className="safety-bg-map"
      />
    </div>
    
    {/* Right: Ecology */}
    <div className="eco-half">
      <div className="content-overlay">
        <h2>🌿 Экология</h2>
        <p>
          Собирайте Eco-points за бережное поведение 
          и получайте скидки на туры.
        </p>
        
        <div className="eco-stats">
          <Stat 
            label="Eco-points собрано" 
            value={ecoStats.totalPoints} 
            icon="🌿"
          />
          <Stat 
            label="Эко-туристов" 
            value={ecoStats.tourists} 
            icon="♻️"
          />
          <Stat 
            label="Мусора собрано (кг)" 
            value={ecoStats.wasteCollected} 
            icon="🗑️"
          />
        </div>
        
        <EcoAchievementBadges badges={topAchievements} />
        
        <Button variant="green" size="lg">
          Присоединиться →
        </Button>
      </div>
      
      {/* Background: Nature photo */}
      <img 
        src="/images/kamchatka-nature.jpg" 
        className="eco-bg-image"
      />
    </div>
  </div>
</SafetyEcoSection>
```

**Design:**
- Split screen (50/50)
- Parallax эффект при скролле
- Overlays с градиентами для читаемости

---

### 4.8 TESTIMONIALS (Social Proof)

**Концепция:** Отзывы от всех типов пользователей

```typescript
<TestimonialsSection>
  <h2 className="section-title">
    Что говорят <span className="text-gold">о нас</span>
  </h2>
  
  <div className="testimonials-carousel">
    {testimonials.map(item => (
      <TestimonialCard key={item.id}>
        {/* User info */}
        <div className="testimonial-header">
          <img 
            src={item.user.avatar} 
            className="w-16 h-16 rounded-full"
          />
          <div>
            <h4>{item.user.name}</h4>
            <Badge>{item.user.role}</Badge>
            <Stars rating={item.rating} />
          </div>
        </div>
        
        {/* Review text */}
        <p className="testimonial-text">
          "{item.text}"
        </p>
        
        {/* Meta */}
        <div className="testimonial-meta">
          <span>{item.date}</span>
          <span>✅ Verified</span>
        </div>
      </TestimonialCard>
    ))}
  </div>
</TestimonialsSection>
```

**Примеры отзывов:**

**От туриста:**
> "Забронировал тур на вулкан через Kamchatour. Всё прошло идеально! 
> AI-помощник помог выбрать подходящий тур под мою физическую форму. 
> Рекомендую!" - Алексей, Москва ⭐⭐⭐⭐⭐

**От оператора:**
> "Платформа значительно упростила управление бронированиями. 
> Автоматизация высвободила время на развитие новых туров. 
> ROI окупился за 2 месяца." - Мария, "Камчатка Tours" ⭐⭐⭐⭐⭐

**От гида:**
> "Удобный календарь, четкие уведомления, прозрачная система оплаты. 
> Всё что нужно гиду - в одном приложении." - Иван, гид ⭐⭐⭐⭐⭐

---

### 4.9 PLATFORM STATS (Animated Counters)

**Концепция:** Impressive numbers

```typescript
<PlatformStats>
  <div className="stats-hero">
    <h2 className="section-title">
      Kamchatour Hub <span className="text-gold">в цифрах</span>
    </h2>
    
    <div className="stats-grid-large">
      <StatCard 
        icon="🏔️"
        value={stats.tours}
        label="Туров"
        suffix="+"
        animated={true}
      />
      <StatCard 
        icon="🤝"
        value={stats.partners}
        label="Партнеров"
        suffix="+"
        animated={true}
      />
      <StatCard 
        icon="🧳"
        value={stats.tourists}
        label="Туристов"
        suffix="+"
        animated={true}
      />
      <StatCard 
        icon="⭐"
        value={stats.reviews}
        label="Отзывов"
        suffix="+"
        animated={true}
      />
      <StatCard 
        icon="💰"
        value={stats.bookings}
        label="Бронирований"
        suffix="+"
        animated={true}
      />
      <StatCard 
        icon="🌿"
        value={stats.ecoPoints}
        label="Eco-points"
        suffix="+"
        animated={true}
      />
    </div>
  </div>
</PlatformStats>
```

**Анимация:**
- CountUp animation (от 0 до значения)
- Срабатывает когда элемент появляется в viewport
- Duration: 2 секунды
- Easing: ease-out

---

### 4.10 CTA SECTION (Final Push)

**Концепция:** Последний призыв к действию

```typescript
<CTASection>
  <div className="cta-hero">
    {/* Background gradient */}
    <div className="cta-gradient"></div>
    
    {/* Content */}
    <div className="cta-content">
      <h2 className="cta-title">
        Готовы начать? 
        <span className="text-gold block mt-2">
          Выберите свою роль
        </span>
      </h2>
      
      <p className="cta-subtitle">
        Присоединяйтесь к экосистеме туризма Камчатки уже сегодня
      </p>
      
      {/* Role buttons */}
      <div className="cta-roles-grid">
        <RoleButton 
          icon="🧳"
          role="Турист"
          description="Найти тур"
          href="/hub/tourist"
          variant="primary"
        />
        <RoleButton 
          icon="🎯"
          role="Оператор"
          description="Создать туры"
          href="/hub/operator"
          variant="gold"
        />
        <RoleButton 
          icon="🎓"
          role="Гид"
          description="Проводить туры"
          href="/hub/guide"
          variant="green"
        />
        <RoleButton 
          icon="🚗"
          role="Трансфер"
          description="Возить туристов"
          href="/hub/transfer-operator"
          variant="purple"
        />
        <RoleButton 
          icon="🎫"
          role="Агент"
          description="Продавать туры"
          href="/hub/agent"
          variant="orange"
        />
        <RoleButton 
          icon="✨"
          role="Демо"
          description="Попробовать всё"
          href="/demo"
          variant="outline"
        />
      </div>
      
      {/* Alternative CTA */}
      <div className="cta-alternative">
        <p>Не уверены с чего начать?</p>
        <Button variant="outline" size="lg">
          Пообщаться с AI-помощником →
        </Button>
      </div>
    </div>
  </div>
</CTASection>
```

---

## 🎨 5. ЦВЕТОВАЯ ПАЛИТРА

### 5.1 Primary Colors

```css
/* Core */
--premium-black: #0a0a0a;
--premium-gold: #d4af37;
--white: #ffffff;

/* Role Colors */
--tourist-blue: #3B82F6;
--operator-gold: #d4af37;
--guide-green: #10B981;
--transfer-purple: #8B5CF6;
--agent-orange: #F59E0B;
--admin-red: #EF4444;

/* Semantic Colors */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;

/* Neutrals */
--gray-50: #FAFAFA;
--gray-100: #F5F5F5;
--gray-200: #E5E5E5;
--gray-300: #D4D4D4;
--gray-400: #A3A3A3;
--gray-500: #737373;
--gray-600: #525252;
--gray-700: #404040;
--gray-800: #262626;
--gray-900: #171717;
```

### 5.2 Gradients

```css
/* Gold Gradient */
.gradient-gold {
  background: linear-gradient(135deg, #d4af37 0%, #ffd700 50%, #b8860b 100%);
}

/* Aurora Gradient */
.gradient-aurora {
  background: linear-gradient(45deg, 
    rgba(212, 175, 55, 0.1) 0%, 
    rgba(255, 215, 0, 0.2) 25%, 
    rgba(184, 134, 11, 0.1) 50%, 
    rgba(212, 175, 55, 0.2) 75%, 
    rgba(255, 215, 0, 0.1) 100%
  );
}

/* Dark Overlay */
.gradient-overlay {
  background: linear-gradient(
    to bottom,
    rgba(10, 10, 10, 0) 0%,
    rgba(10, 10, 10, 0.7) 70%,
    rgba(10, 10, 10, 0.9) 100%
  );
}
```

---

## 📱 6. RESPONSIVE DESIGN

### 6.1 Breakpoints

```css
/* Mobile First */
--xs: 0px;      /* 0-639px */
--sm: 640px;    /* Small devices */
--md: 768px;    /* Tablets */
--lg: 1024px;   /* Laptops */
--xl: 1280px;   /* Desktops */
--2xl: 1536px;  /* Large screens */
```

### 6.2 Layout Adaptations

**Mobile (< 768px):**
- Hero: Упрощенная версия, статичная графика
- Value Props: 1 колонка
- Role Selector: 2 колонки (3 ряда)
- Live Ecosystem: 1 колонка, stack vertically
- Featured Tours: 1 карточка на экран
- Safety & Eco: Stack vertically
- CTA Roles: 2 колонки (3 ряда)

**Tablet (768px - 1024px):**
- Hero: Полная версия, медленная анимация
- Value Props: 3 колонки, меньший padding
- Role Selector: 3 колонки (2 ряда)
- Live Ecosystem: 2 колонки
- Featured Tours: 2 карточки
- Safety & Eco: Split screen 50/50
- CTA Roles: 3 колонки (2 ряда)

**Desktop (> 1024px):**
- Hero: Полная версия, все анимации
- Value Props: 3 колонки, full padding
- Role Selector: 3 колонки (2 ряда)
- Live Ecosystem: 4 колонки
- Featured Tours: Carousel с 3 карточками
- Safety & Eco: Split screen 50/50
- CTA Roles: 6 колонок (1 ряд)

---

## ⚡ 7. PERFORMANCE OPTIMIZATION

### 7.1 Critical Rendering Path

1. **Above the fold (Hero):**
   - Inline critical CSS
   - Preload hero video (первые 3 секунды)
   - Defer non-critical scripts

2. **Lazy Loading:**
   - Images: `loading="lazy"` для всех ниже fold
   - Videos: Autoplay только когда в viewport
   - Components: Dynamic imports для тяжелых виджетов

3. **Code Splitting:**
   ```typescript
   // Lazy load widgets
   const WeatherWidget = dynamic(() => import('@/components/WeatherWidget'), {
     ssr: false,
     loading: () => <WidgetSkeleton />
   });
   
   const AIChatWidget = dynamic(() => import('@/components/AIChatWidget'), {
     ssr: false,
     loading: () => <ChatSkeleton />
   });
   ```

4. **Image Optimization:**
   - Next.js Image component everywhere
   - WebP format с JPEG fallback
   - Responsive images (srcset)
   - Blur placeholders

### 7.2 Target Metrics

- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1
- **TTI (Time to Interactive):** < 3.5s

---

## 🎬 8. ANIMATIONS & INTERACTIONS

### 8.1 Micro-interactions

**Buttons:**
```css
.button {
  transition: all 0.2s ease;
}
.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);
}
.button:active {
  transform: translateY(0);
}
```

**Cards:**
```css
.card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.card:hover {
  transform: scale(1.02);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}
```

**Role Selector:**
- На наведение: Expand (height: auto)
- Остальные: Shrink (scale: 0.95, opacity: 0.7)
- Smooth transition (0.3s ease-in-out)

### 8.2 Scroll Animations

**Fade In on Scroll:**
```typescript
// Use Intersection Observer
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
        }
      });
    },
    { threshold: 0.1 }
  );
  
  document.querySelectorAll('.animate-on-scroll').forEach((el) => {
    observer.observe(el);
  });
}, []);
```

**Parallax Effect:**
- Hero background: `transform: translateY(scrollY * 0.5)`
- Section backgrounds: Subtle parallax

---

## 📊 9. CONVERSION OPTIMIZATION

### 9.1 CTA Hierarchy

**Primary CTAs (Gold):**
1. "Найти тур" (Hero)
2. "Стать оператором" (Value Props)
3. "Войти как [Role]" (Role Selector)
4. "Забронировать" (Featured Tours)
5. "Выберите роль" (Final CTA)

**Secondary CTAs (Outline):**
- "Стать партнером" (Hero)
- "Узнать больше" (Value Props)
- "Смотреть все туры" (Featured Tours)
- "Попробовать демо" (Multiple locations)

**Tertiary CTAs (Text links):**
- Navigation links
- Footer links
- "Листайте вниз" (Hero)

### 9.2 A/B Testing Plan

**Test 1: Hero CTA Buttons**
- Variant A: "Найти тур" + "Стать партнером" + "Демо"
- Variant B: "Начать" + "Для бизнеса" + "Демо"
- Metric: Click-through rate

**Test 2: Role Selector Interaction**
- Variant A: Hover to expand
- Variant B: Click to expand
- Metric: Engagement time

**Test 3: Value Props Order**
- Variant A: Туристы | Бизнес | Партнеры
- Variant B: Бизнес | Туристы | Партнеры
- Metric: Operator registrations

---

## 🛠️ 10. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
- [ ] Новая структура компонентов
- [ ] Цветовая система (Tailwind config)
- [ ] Typography система
- [ ] Grid & Layout система

### Phase 2: Hero & Core (Week 3-4)
- [ ] Hero Section (с анимацией)
- [ ] Value Proposition
- [ ] Role Selector
- [ ] Responsive layouts

### Phase 3: Widgets & Content (Week 5-6)
- [ ] Live Ecosystem dashboard
- [ ] Featured Tours carousel
- [ ] AI Assistant demo
- [ ] Safety & Eco split

### Phase 4: Polish & Optimization (Week 7-8)
- [ ] Testimonials
- [ ] Platform Stats
- [ ] Final CTA
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Analytics integration

### Phase 5: Testing & Launch (Week 9-10)
- [ ] Cross-browser testing
- [ ] Mobile testing
- [ ] A/B test setup
- [ ] Soft launch
- [ ] Monitor metrics
- [ ] Iterate based on data

---

## 🎯 11. SUCCESS METRICS

### 11.1 Primary KPIs

**Conversion Rates:**
- **Hero → Tour Search:** Target 40%
- **Hero → Demo:** Target 15%
- **Role Selector → Dashboard:** Target 25%
- **Featured Tours → Booking:** Target 10%

**Engagement:**
- **Avg Time on Page:** Target 5+ minutes
- **Scroll Depth:** Target 80%+
- **AI Chat Interactions:** Target 20%+
- **Role Selector Interactions:** Target 30%+

**Business Metrics:**
- **Tourist Registrations:** +50% vs old design
- **Operator Registrations:** +100% vs old design
- **Bookings:** +30% vs old design
- **Bounce Rate:** < 40%

### 11.2 Secondary Metrics

- Page Load Time: < 3s
- Mobile Usability Score: 95+
- Lighthouse Performance: 90+
- SEO Score: 95+

---

## 📝 12. CONTENT STRATEGY

### 12.1 SEO Optimization

**Title:**
```
Kamchatour Hub - Экосистема туризма Камчатки | Туры, Трансферы, Гиды
```

**Meta Description:**
```
Единая платформа для туризма на Камчатке. 100+ туров, AI-помощник, 
онлайн-бронирование, трансферы, гиды. Для туристов и турбизнеса. 
Безопасность 24/7, система лояльности, эко-баллы.
```

**Keywords:**
- Камчатка туры
- Экскурсии на Камчатке
- Вулканы Камчатки
- Туристическая платформа
- Бронирование туров онлайн
- Трансферы Камчатка
- Гиды Камчатка

### 12.2 Schema Markup

```json
{
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  "name": "Kamchatour Hub",
  "description": "Экосистема туризма Камчатки",
  "url": "https://kamchatour.ru",
  "logo": "https://kamchatour.ru/logo.png",
  "sameAs": [
    "https://t.me/kamchatour",
    "https://vk.com/kamchatour"
  ],
  "address": {
    "@type": "PostalAddress",
    "addressRegion": "Камчатский край",
    "addressCountry": "RU"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "53.0195",
    "longitude": "158.6505"
  }
}
```

---

## 🎨 13. VISUAL REFERENCES

### 13.1 Design Inspiration

**Премиальность:**
- Apple.com (чистота, пространство)
- Tesla.com (инновации, будущее)
- Stripe.com (профессионализм)

**Туризм:**
- Airbnb Experiences (карточки, UX)
- GetYourGuide (поиск, фильтры)
- TripAdvisor (отзывы, рейтинги)

**Dashboards:**
- Linear.app (минимализм, скорость)
- Notion (гибкость, модули)
- Retool (роли, permissions)

### 13.2 Typography

**Headings:**
```css
--font-display: 'Inter', system-ui, sans-serif;
font-weight: 900; /* Black */
letter-spacing: -0.02em; /* Tight */
```

**Body:**
```css
--font-body: 'Inter', system-ui, sans-serif;
font-weight: 400; /* Regular */
line-height: 1.6;
```

**Mono (code):**
```css
--font-mono: 'JetBrains Mono', monospace;
```

---

## 🚀 14. NEXT STEPS

### Immediate Actions:

1. **Утвердить концепцию** с командой/стейкхолдерами
2. **Создать UI kit** в Figma (опционально)
3. **Начать разработку** Phase 1
4. **Подготовить контент** (тексты, изображения, видео)
5. **Настроить аналитику** (Google Analytics, Yandex.Metrica)

### Development Order:

```
1. Refactor current homepage → backup
2. Create new component structure
3. Implement Hero section
4. Implement Role Selector
5. Implement Live Ecosystem
6. Implement remaining sections
7. Add animations
8. Optimize performance
9. Test on all devices
10. Deploy to staging
11. A/B test
12. Deploy to production
```

---

## 🎯 15. CONCLUSION

**Новая главная страница** превращает Kamchatour из "еще одного сайта с турами" в **профессиональную экосистему** с четким позиционированием для каждой роли.

### Ключевые преимущества:

✅ **Для туристов:** Понятно, что это полноценная платформа с AI, погодой, безопасностью  
✅ **Для бизнеса:** Видно возможности для операторов, гидов, агентов  
✅ **Для партнеров:** Ясная value proposition и легкий вход  
✅ **Для платформы:** Конверсия во все типы регистраций  

### ROI:

**Инвестиции:**
- Дизайн: 0₽ (концепция готова)
- Разработка: 2-3 недели
- Контент: 1 неделя

**Ожидаемая отдача:**
- +50% регистраций туристов
- +100% регистраций операторов
- +30% бронирований
- Окупаемость: 1-2 месяца

---

**Готово к реализации!** 🚀

---

**Дата:** 2025-11-12  
**Автор:** AI Assistant  
**Версия:** 2.0 - Revolutionary Design
