async function main() {
  console.log('Testing fetch to kamchatkaland.ru...');
  try {
    const res = await fetch('https://kamchatkaland.ru/note/dolina-gejzerov', {
      headers: { 'User-Agent': 'TourHabBot/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    console.log('status:', res.status);
    const html = await res.text();
    console.log('length:', html.length);
    console.log('first 300:', html.slice(0, 300));
  } catch (e) {
    console.error('Error:', e);
  }
}
main();
