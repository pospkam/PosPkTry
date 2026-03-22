'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import RouteCard, { type RouteItem } from '@/components/routes/RouteCard';
import {
  Phone, MapPin, Shield, Star, ChevronDown, Calendar,
  Fish, Home, Users, Mountain, Compass, Car, Snowflake, Bird, Waves, Trees,
} from 'lucide-react';
import { useSourceTracker } from '@/hooks/useSourceTracker';

const LeafletMap = dynamic(() => import('@/components/shared/LeafletMap'), { ssr: false });

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield, Star, Fish, Home, Users, Calendar, MapPin, Phone,
  Mountain, Compass, Car, Snowflake, Bird, Waves, Trees,
};

interface OperatorProfile {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  shortDescription: string | null;
  heroImage: string | null;
  gallery: string[];
  services: Array<{
    title: string;
    desc: string;
    prices: { winter?: string; summer?: string };
    includes: string[];
  }>;
  features: Array<{ icon: string; title: string; desc: string }>;
  faq: Array<{ q: string; a: string }>;
  seasonInfo: Array<{ months: string; fish: string; season: string }>;
  reviewsData: Array<{ name: string; date: string; text: string; source: string; verified?: boolean }>;
  contacts: Array<{ name: string; phone: string; role: string; address?: string }>;
  location: { lat: number; lng: number; address: string; officeAddress?: string } | null;
  legalInfo: Record<string, unknown> | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

interface LiveReview {
  id: string;
  rating: number;
  comment: string;
  isVerified: boolean;
  createdAt: string;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? 'text-[var(--warning)] fill-[var(--warning)]' : 'text-[var(--border)]'}`}
        />
      ))}
    </div>
  );
}

export default function OperatorProfileClient({ slug }: { slug: string }) {
  const [op, setOp] = useState<OperatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [liveReviews, setLiveReviews] = useState<LiveReview[]>([]);
  const [platformRoutes, setPlatformRoutes] = useState<RouteItem[]>([]);
  useSourceTracker();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/operators/${slug}`);
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) return;
        const json = await res.json();
        if (json.success) {
          setOp(json.data);
          // Fetch live platform reviews for this operator
          try {
            const rRes = await fetch(`/api/reviews?operatorId=${json.data.id}&limit=20`);
            if (rRes.ok) {
              const rJson = await rRes.json();
              if (rJson.success && Array.isArray(rJson.data)) {
                setLiveReviews(rJson.data as LiveReview[]);
              }
            }
          } catch {
            // silent — live reviews are optional
          }
        } else {
          setNotFound(true);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  // Маршруты оператора на TourHab
  useEffect(() => {
    if (!op) return;
    fetch(`/api/operators/${slug}/routes`)
      .then(r => r.json())
      .then(j => {
        if (j.success && Array.isArray(j.data)) {
          setPlatformRoutes(j.data as RouteItem[]);
        }
      })
      .catch(() => { /* silent */ });
  }, [op, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          source_url: `https://tourhab.ru/operators/${slug}`,
          route_title: `${op?.name ?? 'Партнёр'} (заявка)`,
        }),
      });
    } catch { /* silent */ }
    setSent(true);
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
          <div className="animate-spin w-10 h-10 rounded-full border-4 border-[var(--accent)] border-t-transparent" />
        </div>
      </>
    );
  }

  if (notFound || !op) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4">
          <MapPin className="w-12 h-12 text-[var(--text-muted)]" />
          <p className="text-[var(--text-secondary)]">Оператор не найден</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">

        {/* Partner badge */}
        {op.isVerified && (
          <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 py-2">
            <div className="max-w-6xl mx-auto flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Shield className="w-3.5 h-3.5 text-[var(--success)]" />
              <span>Проверенный партнёр платформы TourHab</span>
            </div>
          </div>
        )}

        {/* Hero */}
        <section className="relative h-[50vh] min-h-[360px] overflow-hidden">
          {op.heroImage ? (
            <Image src={op.heroImage} alt={op.name} fill className="object-cover object-top" priority sizes="100vw" />
          ) : (
            <div className="w-full h-full bg-[var(--bg-hover)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-playfair)' }}>
                {op.name}
              </h1>
              {op.shortDescription && (
                <p className="text-white/80 text-lg max-w-2xl mb-4">{op.shortDescription}</p>
              )}
              <button onClick={() => setShowModal(true)} className="ds-btn ds-btn-primary px-6 py-3">
                Оставить заявку
              </button>
            </div>
          </div>
        </section>

        {/* Features */}
        {op.features.length > 0 && (
          <section className="py-14 px-4">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {op.features.map((f, i) => {
                const Icon = ICON_MAP[f.icon] ?? Shield;
                return (
                  <div key={i} className="ds-card p-6">
                    <Icon className="w-7 h-7 text-[var(--accent)] mb-3" />
                    <h3 className="font-bold mb-1">{f.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Services */}
        {op.services.length > 0 && (
          <section className="py-14 px-4 bg-[var(--bg-card)]">
            <div className="max-w-6xl mx-auto">
              <h2 className="ds-h2 text-center mb-10" style={{ fontFamily: 'var(--font-playfair)' }}>Услуги и туры</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {op.services.map((s, i) => (
                  <div key={i} className="ds-card p-6 flex flex-col">
                    <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4 flex-1">{s.desc}</p>
                    <div className="flex gap-3 mb-4">
                      {s.prices.winter && (
                        <div className="flex-1 bg-[var(--bg-primary)] rounded-lg p-3 text-center">
                          <p className="text-xs text-[var(--text-muted)] mb-1">Зима</p>
                          <p className="font-bold text-sm text-[var(--accent)]">{s.prices.winter}</p>
                        </div>
                      )}
                      {s.prices.summer && (
                        <div className="flex-1 bg-[var(--bg-primary)] rounded-lg p-3 text-center">
                          <p className="text-xs text-[var(--text-muted)] mb-1">Лето</p>
                          <p className="font-bold text-sm text-[var(--ocean)]">{s.prices.summer}</p>
                        </div>
                      )}
                    </div>
                    {s.includes.length > 0 && (
                      <ul className="space-y-1">
                        {s.includes.map((inc, j) => (
                          <li key={j} className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
                            {inc}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Platform Routes */}
        {platformRoutes.length > 0 && (
          <section className="py-14 px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="ds-h2 text-center mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
                Маршруты на TourHab
              </h2>
              <p className="text-center text-sm text-[var(--text-secondary)] mb-8">
                Маршруты {op.name} с онлайн-бронированием
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {platformRoutes.map(r => (
                  <RouteCard key={r.id} route={r} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Season */}
        {op.seasonInfo.length > 0 && (
          <section className="py-14 px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="ds-h2 text-center mb-10" style={{ fontFamily: 'var(--font-playfair)' }}>Сезонный календарь</h2>
              <div className="space-y-3">
                {op.seasonInfo.map((s, i) => (
                  <div key={i} className="ds-card p-4 flex items-center gap-4">
                    <div className="w-2 h-10 rounded-full" style={{ background: s.season === 'Зима' ? '#64B5F6' : 'var(--accent)' }} />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{s.months}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{s.fish}</p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] uppercase">{s.season}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Gallery */}
        {op.gallery.length > 0 && (
          <section className="py-14 px-4 bg-[var(--bg-card)]">
            <div className="max-w-6xl mx-auto">
              <h2 className="ds-h2 text-center mb-10" style={{ fontFamily: 'var(--font-playfair)' }}>Галерея</h2>
              <div
                className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3"
                style={{ gridAutoRows: '160px', gridAutoFlow: 'dense' }}
              >
                {op.gallery.map((img, i) => {
                  const src = img.startsWith('/') ? img : `/images/fishingkam/${img}`;
                  // Vary card sizes like homepage category moodboard
                  const isLarge = i === 0;
                  const isTall  = !isLarge && i % 5 === 1;
                  const isWide  = !isLarge && !isTall && i % 7 === 4;
                  return (
                    <div
                      key={i}
                      className={[
                        'group relative overflow-hidden rounded-lg',
                        isLarge ? 'md:col-span-2 md:row-span-2' : '',
                        isTall  ? 'md:row-span-2'  : '',
                        isWide  ? 'md:col-span-2'  : '',
                      ].join(' ')}
                    >
                      <Image
                        src={src}
                        alt={`${op.name} — фото ${i + 1}`}
                        fill
                        className="object-cover object-top group-hover:scale-110 transition-transform duration-700 ease-out"
                        sizes={isLarge || isWide ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
                        loading={i < 4 ? 'eager' : 'lazy'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent group-hover:from-black/50 transition-all duration-300" />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Reviews */}
        {(liveReviews.length > 0 || op.reviewsData.length > 0) && (
          <section className="py-14 px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="ds-h2 text-center mb-10" style={{ fontFamily: 'var(--font-playfair)' }}>Отзывы</h2>

              {/* Live platform reviews */}
              {liveReviews.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-[var(--success)]" />
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      Отзывы туристов с платформы TourHab ({liveReviews.length})
                    </span>
                  </div>
                  <div className="space-y-4">
                    {liveReviews.map((r) => (
                      <div key={r.id} className="ds-card p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--ocean)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            Т
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">Турист TourHab</p>
                              {r.isVerified && (
                                <span className="text-xs text-[var(--success)] flex items-center gap-0.5">
                                  <Shield className="w-3 h-3" /> Подтверждён
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <StarRow rating={r.rating} />
                              <span className="text-xs text-[var(--text-muted)]">
                                {new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {r.comment && (
                          <p className="text-sm text-[var(--text-secondary)]">{r.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Static partner reviews */}
              {op.reviewsData.length > 0 && (
                <div>
                  {liveReviews.length > 0 && (
                    <p className="text-sm text-[var(--text-muted)] mb-4">Отзывы с других платформ</p>
                  )}
                  <div className="space-y-4">
                    {op.reviewsData.map((r, i) => (
                      <div key={i} className="ds-card p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
                            {r.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{r.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{r.date} · {r.source}</p>
                          </div>
                          {r.verified && (
                            <span className="text-xs text-[var(--success)] flex items-center gap-1">
                              <Shield className="w-3 h-3" /> Подтверждён
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">{r.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* FAQ */}
        {op.faq.length > 0 && (
          <section className="py-14 px-4 bg-[var(--bg-card)]">
            <div className="max-w-3xl mx-auto">
              <h2 className="ds-h2 text-center mb-10" style={{ fontFamily: 'var(--font-playfair)' }}>Частые вопросы</h2>
              <div className="space-y-2">
                {op.faq.map((item, i) => (
                  <div key={i} className="ds-card overflow-hidden">
                    <button
                      onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left"
                    >
                      <span className="font-medium text-sm">{item.q}</span>
                      <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${faqOpen === i ? 'rotate-180' : ''}`} />
                    </button>
                    {faqOpen === i && (
                      <div className="px-5 pb-4 text-sm text-[var(--text-secondary)]">{item.a}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-16 px-4 bg-[var(--accent)] text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-playfair)' }}>
            Готовы к приключению?
          </h2>
          <p className="text-white/80 mb-8 text-lg">Оставьте заявку — мы свяжемся и ответим на все вопросы</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => setShowModal(true)} className="px-8 py-3.5 bg-white text-[var(--accent)] font-semibold rounded-lg hover:bg-white/90 transition-colors">
              Оставить заявку
            </button>
            {op.contacts[0]?.phone && (
              <a href={`tel:${op.contacts[0].phone}`} className="px-8 py-3.5 border border-white/40 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />
                {op.contacts[0].phone}
              </a>
            )}
          </div>
        </section>

        {/* Contacts + Map */}
        <section className="py-14 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="ds-h2 text-center mb-10" style={{ fontFamily: 'var(--font-playfair)' }}>Контакты</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-8">
              {op.contacts.map((c, i) => (
                <div key={i} className="ds-card p-6">
                  <Phone className="w-6 h-6 text-[var(--accent)] mx-auto mb-3" />
                  <p className="font-semibold mb-1">{c.name}</p>
                  <a href={`tel:${c.phone}`} className="text-[var(--ocean)] hover:underline">{c.phone}</a>
                  {c.role && <p className="text-xs text-[var(--text-muted)] mt-1">{c.role}</p>}
                  {c.address && <p className="text-xs text-[var(--text-secondary)] mt-1">{c.address}</p>}
                </div>
              ))}
            </div>

            {op.location && (() => {
              const li = op.legalInfo as Record<string, string | undefined> | null;
              const markers: Array<{ coords: [number, number]; title: string; description?: string; color?: string }> = [
                {
                  coords: [op.location.lat, op.location.lng],
                  title: op.name,
                  description: op.location.address,
                  color: 'blue',
                },
              ];
              // Второй маркер — офис (если адрес отличается от участка)
              if (op.location.officeAddress) {
                markers.push({
                  coords: [53.1838, 158.3804],
                  title: 'Офис',
                  description: op.location.officeAddress,
                  color: 'orange',
                });
              }
              return (
                <>
                  <LeafletMap
                    center={[op.location.lat, op.location.lng]}
                    zoom={10}
                    markers={markers}
                    height="360px"
                  />
                  {/* Рыболовный участок — описание */}
                  {li?.fishingAreaBounds && (
                    <div className="mt-6 ds-card p-5 flex gap-4 items-start">
                      <MapPin className="w-5 h-5 text-[var(--ocean)] flex-shrink-0 mt-0.5" />
                      <div className="text-sm space-y-1">
                        <p className="font-semibold text-[var(--text-primary)]">
                          Рыболовный участок №1182, р. Камчатка
                        </p>
                        {li.fishingArea && (
                          <p className="text-[var(--text-secondary)]">
                            Площадь: {li.fishingArea}
                          </p>
                        )}
                        <p className="text-[var(--text-muted)] font-mono text-xs leading-relaxed">
                          {li.fishingAreaBounds}
                        </p>
                        {li.license && (
                          <p className="text-[var(--text-muted)]">{li.license}</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Legal info */}
            {op.legalInfo && (() => {
              const li = op.legalInfo as Record<string, string | undefined>;
              return (
                <div className="mt-8 text-center text-xs text-[var(--text-muted)] space-y-1">
                  {li.companyName && <p>{li.companyName}</p>}
                  {li.inn && <p>ИНН {li.inn}{li.ogrn ? ` · ОГРН ${li.ogrn}` : ''}</p>}
                  {li.address && <p>{li.address}</p>}
                </div>
              );
            })()}
          </div>
        </section>
      </main>

      {/* Lead modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            {sent ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-[var(--success)]/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-[var(--success)] text-xl">✓</span>
                </div>
                <h3 className="font-bold text-lg mb-1">Заявка принята!</h3>
                <p className="text-[var(--text-secondary)] text-sm">Свяжемся с вами в ближайшее время.</p>
                <button onClick={() => { setShowModal(false); setSent(false); setName(''); setPhone(''); setConsent(false); }} className="mt-4 ds-btn ds-btn-secondary text-sm">
                  Закрыть
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-playfair)' }}>Оставить заявку</h3>
                  <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="ds-label">Имя</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ваше имя" className="ds-input w-full mt-1" />
                  </div>
                  <div>
                    <label className="ds-label">Телефон</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+7 (___) ___-____" className="ds-input w-full mt-1" />
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" required />
                    <span className="text-xs text-[var(--text-muted)]">
                      Подтверждаю согласие на обработку персональных данных в соответствии с ФЗ «О персональных данных»
                    </span>
                  </label>
                  <button type="submit" disabled={!name || !phone || !consent} className="ds-btn ds-btn-primary w-full disabled:opacity-50">
                    Отправить заявку
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
