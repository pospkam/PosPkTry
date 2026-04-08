import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, MapPin, ShieldCheck, Fish, Home, Calendar, Users, Star, Shield, Phone } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { OperatorRating } from '@/components/operator/OperatorRating';
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

// ── Typed service / feature / contact / legal structures ──────────────────

interface ServiceItem {
  title: string;
  desc?: string;
  prices?: Record<string, string>;
  includes?: string[];
}

interface FeatureItem {
  title: string;
  desc?: string;
  icon?: string;
}

interface ContactItem {
  name?: string;
  role?: string;
  phone?: string;
  address?: string;
}

interface LegalInfo {
  companyName?: string;
  inn?: string;
  ogrn?: string;
  address?: string;
  license?: string;
  fishingArea?: string;
}

function extractServices(items: unknown[] | null): ServiceItem[] {
  if (!items) return [];
  return items.flatMap(item => {
    if (typeof item === 'string' && item.trim()) return [{ title: item.trim() }];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const r = item as Record<string, unknown>;
      const title = typeof r.title === 'string' ? r.title : typeof r.name === 'string' ? r.name : '';
      if (!title) return [];
      return [{
        title,
        desc: typeof r.desc === 'string' ? r.desc : undefined,
        prices: (r.prices && typeof r.prices === 'object' && !Array.isArray(r.prices))
          ? r.prices as Record<string, string> : undefined,
        includes: Array.isArray(r.includes) ? r.includes.filter(x => typeof x === 'string') : undefined,
      }];
    }
    return [];
  });
}

function extractFeatures(items: unknown[] | null): FeatureItem[] {
  if (!items) return [];
  return items.flatMap(item => {
    if (typeof item === 'string' && item.trim()) return [{ title: item.trim() }];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const r = item as Record<string, unknown>;
      const title = typeof r.title === 'string' ? r.title : '';
      if (!title) return [];
      return [{
        title,
        desc: typeof r.desc === 'string' ? r.desc : undefined,
        icon: typeof r.icon === 'string' ? r.icon : undefined,
      }];
    }
    return [];
  });
}

function extractContacts(items: unknown[] | null): ContactItem[] {
  if (!items) return [];
  return items.flatMap((item): ContactItem[] => {
    if (typeof item === 'string' && item.trim()) return [{ phone: item.trim() }];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const r = item as Record<string, unknown>;
      return [{
        name: typeof r.name === 'string' ? r.name : undefined,
        role: typeof r.role === 'string' ? r.role : undefined,
        phone: typeof r.phone === 'string' ? r.phone : undefined,
        address: typeof r.address === 'string' ? r.address : undefined,
      }];
    }
    return [];
  });
}

function extractLegalInfo(raw: unknown): LegalInfo | string | null {
  if (!raw) return null;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    return {
      companyName: typeof r.companyName === 'string' ? r.companyName : undefined,
      inn: typeof r.inn === 'string' ? r.inn : undefined,
      ogrn: typeof r.ogrn === 'string' ? r.ogrn : undefined,
      address: typeof r.address === 'string' ? r.address : undefined,
      license: typeof r.license === 'string' ? r.license : undefined,
      fishingArea: typeof r.fishingArea === 'string' ? r.fishingArea : undefined,
    };
  }
  return null;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Shield, Fish, Home, Calendar, Users, Star, MapPin, Phone,
};

// ─────────────────────────────────────────────────────────────────────────────

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

  if (!slug || slug.length > 100) notFound();

  const profile = await getOperatorProfile(slug);
  if (!profile) notFound();

  const services  = extractServices(profile.services);
  const features  = extractFeatures(profile.features);
  const contacts  = extractContacts(profile.contacts);
  const legalInfo = extractLegalInfo(profile.legal_info);
  const rating     = parseScore(profile.rating);
  const reviewCount = parseCount(profile.review_count);
  const gallery   = Array.isArray(profile.gallery)
    ? profile.gallery.filter((x): x is string => typeof x === 'string').slice(0, 6)
    : [];
  const faq = Array.isArray(profile.faq)
    ? (profile.faq as { q: string; a: string }[]).filter(x => x.q && x.a)
    : [];

  const heroImage = profile.hero_image ?? gallery[0] ?? null;

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100dvh]">
      <Header />
      <main className="pt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Link href="/" className="hover:text-[var(--accent)]">Главная</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/operators" className="hover:text-[var(--accent)]">Операторы</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{profile.name}</span>
          </div>

          {/* Hero */}
          <section className="ds-card p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h1 className="font-playfair text-3xl sm:text-4xl font-bold mb-3">{profile.name}</h1>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {profile.category && <span className="ds-badge">{profile.category}</span>}
                  {profile.is_verified && (
                    <span className="inline-flex items-center gap-1 text-sm text-[var(--success)]">
                      <ShieldCheck className="w-4 h-4" /> Проверенный оператор
                    </span>
                  )}
                </div>
                <div className="mb-5">
                  <OperatorRating rating={rating} reviewCount={reviewCount} size="lg" trend={null} />
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
                  {heroImage ? (
                    <Image src={heroImage} alt={profile.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" priority />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                      <MapPin className="w-10 h-10" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Gallery */}
          {gallery.length > 1 && (
            <section className="ds-card p-5">
              <h2 className="font-playfair text-2xl font-bold mb-4">Галерея</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {gallery.slice(0, 6).map((url, i) => (
                  <div key={i} className="relative h-40 rounded-lg overflow-hidden bg-[var(--bg-hover)]">
                    <Image src={url} alt={`${profile.name} ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-300" sizes="33vw" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Services */}
          {services.length > 0 && (
            <section className="ds-card p-5">
              <h2 className="font-playfair text-2xl font-bold mb-4">Услуги</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((s, i) => (
                  <div key={i} className="bg-[var(--bg-hover)] rounded-lg p-4 space-y-2">
                    <p className="font-semibold text-[var(--text-primary)]">{s.title}</p>
                    {s.desc && <p className="text-sm text-[var(--text-secondary)]">{s.desc}</p>}
                    {s.prices && (
                      <div className="space-y-0.5">
                        {Object.entries(s.prices).map(([k, v]) => (
                          <p key={k} className="text-xs text-[var(--text-muted)]">
                            <span className="capitalize">{k === 'summer' ? 'Лето' : k === 'winter' ? 'Зима' : k}:</span>{' '}
                            <span className="font-medium text-[var(--accent)]">{v}</span>
                          </p>
                        ))}
                      </div>
                    )}
                    {s.includes && s.includes.length > 0 && (
                      <ul className="space-y-0.5">
                        {s.includes.map((inc, j) => (
                          <li key={j} className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-[var(--accent)] flex-shrink-0" />
                            {inc}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Features */}
          {features.length > 0 && (
            <section className="ds-card p-5">
              <h2 className="font-playfair text-2xl font-bold mb-4">Особенности</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features.map((f, i) => {
                  const Icon = (f.icon && ICON_MAP[f.icon]) ? ICON_MAP[f.icon] : Shield;
                  return (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-[var(--accent)]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{f.title}</p>
                        {f.desc && <p className="text-sm text-[var(--text-secondary)] mt-0.5">{f.desc}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* FAQ */}
          {faq.length > 0 && (
            <section className="ds-card p-5">
              <h2 className="font-playfair text-2xl font-bold mb-4">Частые вопросы</h2>
              <div className="space-y-4">
                {faq.map((item, i) => (
                  <div key={i} className="border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">{item.q}</p>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Contacts */}
            {contacts.length > 0 && (
              <section className="ds-card p-5">
                <h2 className="font-playfair text-2xl font-bold mb-4">Контакты</h2>
                <div className="space-y-3">
                  {contacts.map((c, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--ocean)]/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-3.5 h-3.5 text-[var(--ocean)]" />
                      </div>
                      <div>
                        {(c.name || c.role) && (
                          <p className="font-semibold text-sm text-[var(--text-primary)]">
                            {c.name}{c.name && c.role ? ' · ' : ''}{c.role}
                          </p>
                        )}
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="text-sm text-[var(--ocean)] hover:underline">
                            {c.phone}
                          </a>
                        )}
                        {c.address && <p className="text-xs text-[var(--text-muted)] mt-0.5">{c.address}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Legal */}
            {legalInfo && (
              <section className="ds-card p-5">
                <h2 className="font-playfair text-2xl font-bold mb-4">Юридическая информация</h2>
                {typeof legalInfo === 'string' ? (
                  <p className="text-[var(--text-secondary)] leading-relaxed">{legalInfo}</p>
                ) : (
                  <dl className="space-y-2 text-sm">
                    {legalInfo.companyName && (
                      <div><dt className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Компания</dt>
                        <dd className="font-medium text-[var(--text-primary)]">{legalInfo.companyName}</dd></div>
                    )}
                    {legalInfo.inn && (
                      <div><dt className="text-[var(--text-muted)] text-xs uppercase tracking-wide">ИНН</dt>
                        <dd className="text-[var(--text-secondary)]">{legalInfo.inn}</dd></div>
                    )}
                    {legalInfo.ogrn && (
                      <div><dt className="text-[var(--text-muted)] text-xs uppercase tracking-wide">ОГРН</dt>
                        <dd className="text-[var(--text-secondary)]">{legalInfo.ogrn}</dd></div>
                    )}
                    {legalInfo.address && (
                      <div><dt className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Адрес</dt>
                        <dd className="text-[var(--text-secondary)]">{legalInfo.address}</dd></div>
                    )}
                    {legalInfo.license && (
                      <div><dt className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Лицензия</dt>
                        <dd className="text-[var(--text-secondary)]">{legalInfo.license}</dd></div>
                    )}
                    {legalInfo.fishingArea && (
                      <div><dt className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Рыболовный участок</dt>
                        <dd className="text-[var(--text-secondary)]">{legalInfo.fishingArea}</dd></div>
                    )}
                  </dl>
                )}
              </section>
            )}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
