import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, MapPin, ShieldCheck, Star } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { query } from '@/lib/database';
import type { OperatorProfileRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

type Params = { slug: string };

function parseScore(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCount(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pushIfText(values: string[], value: unknown) {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized.length > 0) values.push(normalized);
  }
}

function extractStringList(items: unknown[] | null): string[] {
  if (!items) return [];

  const values: string[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      pushIfText(values, item);
      continue;
    }

    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const record = item as Record<string, unknown>;
      pushIfText(values, record.title);
      pushIfText(values, record.name);
      pushIfText(values, record.label);
      pushIfText(values, record.value);
    }
  }

  return Array.from(new Set(values));
}

function extractContacts(items: unknown[] | null, contactFallback: string | null): string[] {
  const values: string[] = [];

  if (items) {
    for (const item of items) {
      if (typeof item === 'string') {
        pushIfText(values, item);
        continue;
      }

      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        for (const value of Object.values(record)) {
          pushIfText(values, value);
        }
      }
    }
  }

  pushIfText(values, contactFallback);
  return Array.from(new Set(values));
}

async function getOperatorProfile(slug: string): Promise<OperatorProfileRow | null> {
  const aliases = slug === 'fishingkam'
    ? ['fishingkam', 'kamchatskaya-rybalka']
    : slug === 'kamchatskaya-rybalka'
      ? ['kamchatskaya-rybalka', 'fishingkam']
      : [slug];

  const result = await query<OperatorProfileRow>(
    `SELECT id, slug, name, category, description, short_description,
            hero_image, gallery, services, features, faq, season_info,
            reviews_data, contacts, location, legal_info, contact,
            rating::text, review_count::text, is_verified, created_at::text
     FROM partners
     WHERE slug = ANY($1) AND is_public = TRUE
     ORDER BY CASE
       WHEN slug = $2 THEN 0
       WHEN slug = 'kamchatskaya-rybalka' THEN 1
       WHEN slug = 'fishingkam' THEN 2
       ELSE 3
     END
     LIMIT 1`,
    [aliases, slug]
  );

  return result.rows[0] ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getOperatorProfile(slug);

  if (!profile) {
    return {
      title: 'Оператор не найден',
      robots: { index: false, follow: true },
    };
  }

  const title = `${profile.name} - оператор Камчатки`;
  const description = profile.short_description
    ?? profile.description
    ?? 'Публичный профиль проверенного оператора на TourHab.';

  return {
    title,
    description,
    alternates: { canonical: `https://tourhab.ru/operators/${profile.slug}` },
    openGraph: {
      title,
      description,
      url: `https://tourhab.ru/operators/${profile.slug}`,
      siteName: 'KamchatourHub',
      locale: 'ru_RU',
      type: 'website',
      images: profile.hero_image ? [{ url: profile.hero_image }] : undefined,
    },
  };
}

export default async function OperatorProfilePage(
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;

  if (!slug || slug.length > 100) {
    notFound();
  }

  const profile = await getOperatorProfile(slug);
  if (!profile) {
    notFound();
  }

  const services = extractStringList(profile.services);
  const features = extractStringList(profile.features);
  const contacts = extractContacts(profile.contacts, profile.contact);
  const rating = parseScore(profile.rating);
  const reviewCount = parseCount(profile.review_count);

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100dvh]">
      <Header />
      <main className="pt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-4">
            <Link href="/" className="hover:text-[var(--accent)]">Главная</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/operators" className="hover:text-[var(--accent)]">Операторы</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{profile.name}</span>
          </div>

          <section className="ds-card p-6 rounded-lg border border-[var(--border)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h1 className="font-playfair text-3xl sm:text-4xl font-bold mb-3">{profile.name}</h1>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {profile.category && (
                    <span className="ds-badge">{profile.category}</span>
                  )}
                  {profile.is_verified && (
                    <span className="inline-flex items-center gap-1 text-sm text-[var(--success)]">
                      <ShieldCheck className="w-4 h-4" />
                      Проверенный оператор
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)] mb-5">
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-[var(--warning)]" />
                    {rating > 0 ? rating.toFixed(1) : 'нет оценок'}
                  </span>
                  <span>{reviewCount > 0 ? `${reviewCount} отзывов` : 'Пока нет отзывов'}</span>
                </div>

                {profile.short_description && (
                  <p className="text-[var(--text-secondary)] text-base mb-3">{profile.short_description}</p>
                )}
                {profile.description && (
                  <p className="text-[var(--text-secondary)] leading-relaxed">{profile.description}</p>
                )}
              </div>

              <div>
                <div className="relative w-full h-64 sm:h-80 rounded-lg overflow-hidden bg-[var(--bg-hover)] border border-[var(--border)]">
                  {profile.hero_image ? (
                    <Image
                      src={profile.hero_image}
                      alt={profile.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                      <MapPin className="w-10 h-10" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {(services.length > 0 || features.length > 0 || contacts.length > 0 || profile.legal_info) && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              {services.length > 0 && (
                <article className="ds-card p-5 rounded-lg border border-[var(--border)]">
                  <h2 className="font-playfair text-2xl font-bold mb-3">Услуги</h2>
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <span key={service} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {service}
                      </span>
                    ))}
                  </div>
                </article>
              )}

              {features.length > 0 && (
                <article className="ds-card p-5 rounded-lg border border-[var(--border)]">
                  <h2 className="font-playfair text-2xl font-bold mb-3">Особенности</h2>
                  <ul className="space-y-2 text-[var(--text-secondary)]">
                    {features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </article>
              )}

              {contacts.length > 0 && (
                <article className="ds-card p-5 rounded-lg border border-[var(--border)]">
                  <h2 className="font-playfair text-2xl font-bold mb-3">Контакты</h2>
                  <ul className="space-y-2 text-[var(--text-secondary)]">
                    {contacts.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              )}

              {profile.legal_info && (
                <article className="ds-card p-5 rounded-lg border border-[var(--border)]">
                  <h2 className="font-playfair text-2xl font-bold mb-3">Юридическая информация</h2>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{profile.legal_info}</p>
                </article>
              )}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
