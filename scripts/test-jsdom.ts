async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const JSDOM = (require('jsdom') as any).JSDOM as new (html: string) => { window: { document: Document } };

  const res = await fetch('https://kamchatkaland.ru/note/dolina-gejzerov', {
    headers: { 'User-Agent': 'TourHabBot/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  const html = await res.text();
  console.log('HTML length:', html.length);

  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    console.log('JSDOM OK, title:', doc.title);

    const paragraphs: string[] = [];
    doc.querySelectorAll('p').forEach((el: Element) => {
      const text = el.textContent?.trim() ?? '';
      if (text.length > 30) paragraphs.push(text);
    });
    console.log('Paragraphs found:', paragraphs.length);
    console.log('First paragraph:', paragraphs[0]?.slice(0, 200));
  } catch (e) {
    console.error('JSDOM error:', e);
  }
}
main().catch(console.error);
