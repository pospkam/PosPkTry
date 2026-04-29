/**
 * scripts/fix-transliterated-names.ts
 * 
 * Finds all routes in agent_route_knowledge where title is purely lowercase latin
 * (transliterated) and maps them to proper Russian names.
 * 
 * Usage:
 *   npx tsx scripts/fix-transliterated-names.ts --dry-run    # preview changes
 *   npx tsx scripts/fix-transliterated-names.ts --apply      # apply changes
 */

import { pool } from '@/lib/db-pool';

// Known transliteration → Russian mapping (extend as needed)
const NAME_MAP: Record<string, string> = {
  'bukhta pionerskaya': 'Бухта Пионерская',
  'golubye ozera': 'Голубые озёра',
  'golubye ozёra': 'Голубые озёра',
  'kamchatskiy kamen': 'Камчатский камень',
  'vodopad babiy kamen': 'Водопад Бабий Камень',
  'vodopad snezhnyy bars': 'Водопад Снежный Барс',
  'avachinskaya bukhta': 'Авачинская бухта',
  'avacha bay': 'Авачинская бухта',
  'mutnovskiy': 'Мутновский вулкан',
  'vulkan gorelyy': 'Вулкан Горелый',
  'vulkan avachinskiy': 'Вулкан Авачинский',
  'vulkan koryakskiy': 'Вулкан Корякский',
  'tolbachik': 'Толбачик',
  'ploskiy tolbachik': 'Плоский Толбачик',
  'kupelevskoye ozero': 'Купелевское озеро',
  'nerpichye ozero': 'Нерпичье озеро',
  'kurilskoye ozero': 'Курильское озеро',
  'dachnye istochniki': 'Дачные источники',
  'malikinskie istochniki': 'Малкинские источники',
  'paratunka': 'Паратунка',
  'nalychevo': 'Налычево',
  'valley of geysers': 'Долина гейзеров',
  'kalkera uzon': 'Кальдера Узон',
};

function transliterateToCyrillic(latin: string): string {
  // Check exact match first
  const exact = NAME_MAP[latin.toLowerCase().trim()];
  if (exact) return exact;

  // Partial match
  for (const [pattern, russian] of Object.entries(NAME_MAP)) {
    if (latin.toLowerCase().includes(pattern) || pattern.includes(latin.toLowerCase())) {
      return russian;
    }
  }

  // Fallback: capitalize words
  return latin
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const mode = dryRun ? 'DRY RUN' : 'APPLY';

  console.log(`\n=== Transliterated Name Fix [${mode}] ===\n`);

  // Find all routes with purely lowercase latin titles
  const { rows } = await pool.query<{ id: string; title: string }>(
    `SELECT id, title FROM agent_route_knowledge
     WHERE title ~ '^[a-z\\s]+$'
       AND LENGTH(title) > 3
     ORDER BY title`
  );

  console.log(`Found ${rows.length} routes with transliterated names:\n`);

  let updated = 0;
  for (const row of rows) {
    const newName = transliterateToCyrillic(row.title);
    const changed = newName !== row.title;

    if (changed) {
      console.log(`  ${row.title} → ${newName}`);
      updated++;

      if (!dryRun) {
        await pool.query(
          `UPDATE agent_route_knowledge SET title = $1, updated_at = NOW() WHERE id = $2`,
          [newName, row.id]
        );
      }
    }
  }

  console.log(`\n${updated} of ${rows.length} names would be changed.`);

  if (dryRun) {
    console.log('\nRun with --apply to make changes.');
  } else {
    console.log(`\n✅ Updated ${updated} route names.`);
  }

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
