import { AlertTriangle, Package, Radio, Heart, Users } from 'lucide-react';
import { HAZARD_LABELS } from './types';
import type { PlaceSafety as SafetyData } from './types';

interface Props {
  safety: SafetyData;
  placeId: string;
}

// 5.1 Опасности
function SafetyHazards({ hazardTypes }: { hazardTypes: string[] }) {
  if (!hazardTypes.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 uppercase tracking-wide">Опасности</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {hazardTypes.map(h => {
          const info = HAZARD_LABELS[h] ?? { label: h, icon: '⚠️' };
          return (
            <div key={h} className="flex items-center gap-2 text-sm">
              <span className="text-base w-6 flex-shrink-0">{info.icon}</span>
              <span className="text-[var(--text-secondary)]">{info.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 5.2 Снаряжение
function SafetyGear({ requiredGear }: { requiredGear: string[] }) {
  if (!requiredGear.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 uppercase tracking-wide flex items-center gap-1.5">
        <Package className="w-3.5 h-3.5" /> Что взять с собой
      </h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {requiredGear.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// 5.3 Связь и эвакуация
function SafetyConnectivity({ satRequired, emergencyAccess, phoneRanger }: {
  satRequired: boolean | null;
  emergencyAccess: string | null;
  phoneRanger: string | null;
}) {
  const hasData = satRequired != null || emergencyAccess || phoneRanger;
  if (!hasData) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 uppercase tracking-wide flex items-center gap-1.5">
        <Radio className="w-3.5 h-3.5" /> Связь и эвакуация
      </h3>
      <div className="space-y-1.5 text-sm">
        {satRequired != null && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] w-40 flex-shrink-0">Спутниковая связь</span>
            <span className={`font-medium ${satRequired ? 'text-[var(--warning)]' : 'text-[var(--text-primary)]'}`}>
              {satRequired ? 'Требуется' : 'Не требуется'}
            </span>
          </div>
        )}
        {emergencyAccess && (
          <div className="flex items-start gap-2">
            <span className="text-[var(--text-muted)] w-40 flex-shrink-0">Эвакуация</span>
            <span className="text-[var(--text-secondary)]">{emergencyAccess}</span>
          </div>
        )}
        <div className="flex items-start gap-2 pt-1">
          <span className="text-[var(--text-muted)] w-40 flex-shrink-0">Экстренный звонок</span>
          <div className="space-y-1">
            <a href="tel:112" className="block text-[var(--ocean)] hover:text-[var(--accent)] font-medium transition-colors">
              112 — единый
            </a>
            {phoneRanger ? (
              <a href={`tel:${phoneRanger}`} className="block text-[var(--ocean)] hover:text-[var(--accent)] transition-colors">
                {phoneRanger} — МЧС Камчатка
              </a>
            ) : (
              <a href="tel:+74152235362" className="block text-[var(--ocean)] hover:text-[var(--accent)] transition-colors">
                +7 (415) 223-53-62 — МЧС Камчатка
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 5.4 Медпомощь
function SafetyMedical({ nearestMedicalKm, medicalInfo }: {
  nearestMedicalKm: number | null;
  medicalInfo: string | null;
}) {
  if (!nearestMedicalKm && !medicalInfo) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 uppercase tracking-wide flex items-center gap-1.5">
        <Heart className="w-3.5 h-3.5" /> Медицинская помощь
      </h3>
      <div className="space-y-1.5 text-sm">
        {nearestMedicalKm != null && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] w-40 flex-shrink-0">До медпункта</span>
            <span className="font-medium text-[var(--text-primary)]">{nearestMedicalKm} км</span>
          </div>
        )}
        {medicalInfo && (
          <p className="text-[var(--text-secondary)]">{medicalInfo}</p>
        )}
      </div>
    </div>
  );
}

// 5.5 Вместимость и регистрация
function SafetyCapacity({ capacityPerDay, optimalGroupSize, registrationRequired }: {
  capacityPerDay: number | null;
  optimalGroupSize: number | null;
  registrationRequired: boolean;
}) {
  const hasData = capacityPerDay != null || optimalGroupSize != null || registrationRequired;
  if (!hasData) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 uppercase tracking-wide flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> Вместимость и регистрация
      </h3>
      <div className="space-y-1.5 text-sm">
        {capacityPerDay != null && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] w-40 flex-shrink-0">Вместимость</span>
            <span className="text-[var(--text-primary)]">{capacityPerDay} чел/день</span>
          </div>
        )}
        {optimalGroupSize != null && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] w-40 flex-shrink-0">Оптимальная группа</span>
            <span className="text-[var(--text-primary)]">до {optimalGroupSize} чел</span>
          </div>
        )}
        {registrationRequired && (
          <div className="flex items-start gap-2">
            <span className="text-[var(--text-muted)] w-40 flex-shrink-0">Регистрация МЧС</span>
            <a href="/safety/register" className="text-[var(--warning)] font-semibold hover:underline">
              Обязательна → зарегистрироваться
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlaceSafety({ safety, placeId: _ }: Props) {
  const hasAnyData =
    safety.hazardTypes.length > 0 ||
    safety.requiredGear.length > 0 ||
    safety.satCommunicatorRequired != null ||
    safety.emergencyAccess ||
    safety.phoneRangerMches ||
    safety.nearestMedicalKm != null ||
    safety.medicalInfo ||
    safety.capacityPerDay != null ||
    safety.registrationRequired;

  if (!hasAnyData) return null;

  return (
    <section className="max-w-3xl mx-auto px-4">
      <div className="ds-card p-5 border-l-4 border-[var(--warning)]">
        <h2 className="text-base font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
          Безопасность
        </h2>
        <div className="space-y-5 divide-y divide-[var(--border)]">
          <SafetyHazards hazardTypes={safety.hazardTypes} />
          <div className="pt-4"><SafetyGear requiredGear={safety.requiredGear} /></div>
          <div className="pt-4">
            <SafetyConnectivity
              satRequired={safety.satCommunicatorRequired}
              emergencyAccess={safety.emergencyAccess}
              phoneRanger={safety.phoneRangerMches}
            />
          </div>
          <div className="pt-4">
            <SafetyMedical
              nearestMedicalKm={safety.nearestMedicalKm}
              medicalInfo={safety.medicalInfo}
            />
          </div>
          <div className="pt-4">
            <SafetyCapacity
              capacityPerDay={safety.capacityPerDay}
              optimalGroupSize={safety.optimalGroupSize}
              registrationRequired={safety.registrationRequired}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
