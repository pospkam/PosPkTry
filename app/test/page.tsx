/**
 * Простая тестовая страница
 */
export default function TestPage() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>✅ Kamchatour Hub - TEST PAGE</h1>
      <p>Если вы видите эту страницу, значит Next.js работает!</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
}
