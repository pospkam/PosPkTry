import Link from 'next/link';
import { AlertTriangle, Backpack, Radio, Phone, Users, ShieldAlert, Flame, Wind, Mountain, Waves, Eye, Thermometer, CloudLightning, Signal, Leaf, Heart, Book } from 'lucide-react';
import { HAZARD_LABELS } from './types';
import type { PlaceSafety as SafetyData } from './types';

interface Props {
  safety: SafetyData;
  placeId: string;
}

function HazardIcon({ hazard }: { hazard: string }) {
  const cls = 'w-3.5 h-3.5 flex-shrink-0';
  switch (hazard) {
    case 'bears':
    case 'wildlife':      return <AlertTriangle className={cls} />;
    case 'avalanche':     return <Wind className={cls} />;
    case 'rockfall':      return <Mountain className={cls} />;
    case 'thermal':       return <Thermometer className={cls} />;
    case 'volcanic_gas':  return <Flame className={cls} />;
    case 'altitude':      return <Mountain className={cls} />;
    case 'river_crossing':return <Waves className={cls} />;
    case 'fog':           return <Eye className={cls} />;
    case 'ice':           return <CloudLightning className={cls} />;
    case 'no_signal':     return <Signal className={cls} />;
    case 'weather':       return <CloudLightning className={cls} />;
    default:              return <AlertTriangle className={cls} />;
  }
}

export default function PlaceSafety({ safety, placeId: _ }: Props) {
  const hasAnyData =
    safety.hazardTypes.length > 0 ||
    safety.requiredGear.length > 0 ||
    safety.satCommunicatorRequired != null ||
    safety.emergencyAccess ||
    safety.nearestMedicalKm != null ||
    safety.altitudeM != null ||
    safety.capacityPerDay != null ||
    safety.registrationRequired;

  if (!hasAnyData) return null;

  return (
    <section className="max-w-3xl mx-auto px-4 mt-6">
      <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--warning)]/20">
          <ShieldAlert className="w-4 h-4 text-[var(--warning)]" />
          <span className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
            Безопасность
          </span>
        </div>

        <div className="p-4 space-y-4">

          {/* Hazard chips */}
          {safety.hazardTypes.length > 0 && (
            <div>
              <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-2">Опасности</p>
              <div className="flex flex-wrap gap-2">
                {safety.hazardTypes.map(h => {
                  const info = HAZARD_LABELS[h] ?? { label: h };
                  return (
                    <span
                      key={h}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]"
                    >
                      <HazardIcon hazard={h} />
                      {info.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gear */}
          {safety.requiredGear.length > 0 && (
            <div>
              <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Backpack className="w-3.5 h-3.5" /> Снаряжение
              </p>
              <div className="flex flex-wrap gap-1.5">
                {safety.requiredGear.map((g, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nature protection limit */}
          {safety.capacityPerDay != null && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--success)]/8 border border-[var(--success)]/20">
              <Leaf className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[var(--success)] uppercase tracking-wide">
                  Природоохранный лимит
                </p>
                <p className="text-sm text-[var(--text-primary)] font-semibold mt-0.5">
                  до {safety.capacityPerDay} человек в сутки
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Установлен для защиты экосистемы и дикой природы
                </p>
              </div>
            </div>
          )}

          {/* Altitude + Distance to medical */}
          {(safety.altitudeM != null || safety.nearestMedicalKm != null) && (
            <div className="grid grid-cols-2 gap-3">
              {safety.altitudeM != null && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                  <Mountain className="w-4 h-4 text-[var(--ocean)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Высота</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{safety.altitudeM.toLocaleString('ru-RU')} м</p>
                    {safety.altitudeM >= 2500 && (
                      <p className="text-[10px] text-[var(--warning)] mt-0.5">Риск горной болезни</p>
                    )}
                  </div>
                </div>
              )}
              {safety.nearestMedicalKm != null && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                  <Heart className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">До медпомощи</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{safety.nearestMedicalKm} км</p>
                    {safety.nearestMedicalKm >= 50 && (
                      <p className="text-[10px] text-[var(--warning)] mt-0.5">Эвакуация затруднена</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Connectivity + Registration row */}
          {(safety.satCommunicatorRequired || safety.registrationRequired) && (
            <div className="flex flex-wrap gap-3">
              {safety.satCommunicatorRequired && (
                <div className="flex items-center gap-2 text-xs text-[var(--warning)]">
                  <Radio className="w-3.5 h-3.5" />
                  <span className="font-medium">Нужна спутниковая связь</span>
                </div>
              )}
              {safety.registrationRequired && (
                <a
                  href="https://forms.mchs.gov.ru/registration_tourist_groups/form"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-[var(--warning)] hover:underline"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-medium">Регистрация МЧС обязательна</span>
                </a>
              )}
            </div>
          )}

          {/* Emergency contacts */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-[var(--warning)]/15">
            <p className="w-full text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Экстренная помощь
            </p>
            <a
              href="tel:112"
              className="inline-flex items-center gap-2 text-sm font-bold text-white bg-[var(--danger)] px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
            >
              <Phone className="w-3.5 h-3.5" /> 112
            </a>
            <a
              href={`tel:${safety.phoneRangerMches ?? '+74152235362'}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2 rounded-xl hover:border-[var(--accent)] transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              {safety.phoneRangerMches ?? '+7 415 223-53-62'} МЧС
            </a>
          </div>

          {/* Emergency access */}
          {safety.emergencyAccess && (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              <span className="font-medium text-[var(--text-primary)]">Эвакуация:</span> {safety.emergencyAccess}
            </p>
          )}

          {/* Offline survival guide */}
          <Link
            href="/safety/offline"
            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Book className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Инструкции выживания</p>
                <p className="text-[11px] text-[var(--text-muted)]">Работают офлайн — медведь, вулкан, гипотермия</p>
              </div>
            </div>
            <span className="text-xs text-[var(--ocean)]">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
