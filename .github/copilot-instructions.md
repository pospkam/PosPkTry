# Kamhub - Copilot Instructions

## О проекте
Kamhub - туристическая платформа Камчатки. Next.js 15, TypeScript, Tailwind CSS, PostgreSQL.
Продакшен: https://pospk-kamhub-c8e0.twc1.net

## Команды
```bash
npm run dev      # Dev сервер (порт 3000)
npm run build   # Сборка
npm test        # Тесты (vitest)
npm run lint    # Линтинг
```

## React Best Practices (react-doctor rules)

When generating React code, follow these rules:

### 1. useEffect
- Avoid unnecessary useEffect
- Use derived state when possible
- Only for side effects (API calls, subscriptions)

### 2. Accessibility
- Add aria-label to buttons/inputs
- Use semantic HTML
- Ensure keyboard navigation
- Alt text on images

### 3. Composition
- Avoid prop drilling (max 2-3 levels)
- Use Context for global state
- Use children prop for flexibility

### 4. Performance
- React.memo for expensive components
- useMemo for expensive calculations
- useCallback for functions passed to children

### 5. Error Handling
- Error boundaries for components
- Try/catch for async operations
- User-friendly error messages

## Известные проблемы (React Doctor)
- Score: 83/100 (Great)
- Цель: <100 предупреждений
- Page без metadata: 44
- Unused exports: 130
- Unused types: 81

## Паттерны проекта
### Glassmorphism
```css
backdrop-filter: blur(10px);
background: rgba(255, 255, 255, 0.05);
border-radius: 20px;
```

Scan code with: `npx -y react-doctor@latest`
