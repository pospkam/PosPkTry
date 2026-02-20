# Copilot Instructions for this project

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

Scan code with: `npx -y react-doctor@latest`