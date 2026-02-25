'use client';

import React, { useState } from 'react';
import { Bot, Sparkles, AlertTriangle, Check } from 'lucide-react';

interface TourImageTags {
  landscape: string[];
  activity: string[];
  difficulty: 'easy' | 'moderate' | 'extreme';
  season: string[];
  features: string[];
}

interface GenerateTagsButtonProps {
  tourId: string;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Лёгкий',
  moderate: 'Средний',
  extreme: 'Экстремальный',
};

const TAG_LABELS: Record<string, string> = {
  volcano: 'Вулкан',
  geyser: 'Гейзер',
  ocean: 'Океан',
  forest: 'Лес',
  snow: 'Снег',
  mountain: 'Горы',
  river: 'Река',
  lake: 'Озеро',
  beach: 'Пляж',
  tundra: 'Тундра',
  hiking: 'Хайкинг',
  fishing: 'Рыбалка',
  boat: 'Лодка',
  helicopter: 'Вертолёт',
  skiing: 'Лыжи',
  camping: 'Кэмпинг',
  kayaking: 'Каяк',
  snowmobile: 'Снегоход',
  trekking: 'Треккинг',
  wildlife: 'Дикая природа',
  bears: 'Медведи',
  salmon: 'Лосось',
  birds: 'Птицы',
  volcanology: 'Вулканология',
  aurora: 'Северное сияние',
  hot_springs: 'Горячие источники',
  summer: 'Лето',
  winter: 'Зима',
  spring: 'Весна',
  autumn: 'Осень',
};

function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-white/10 border border-white/20 text-white/80 mr-1 mb-1">
      {TAG_LABELS[tag] ?? tag}
    </span>
  );
}

export default function GenerateTagsButton({ tourId }: GenerateTagsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<TourImageTags | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setTags(null);

    try {
      const res = await fetch(`/api/operator/tours/${tourId}/generate-tags`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        setTags(data.data.tags);
      } else {
        setError(data.error ?? 'Ошибка генерации тегов');
      }
    } catch {
      setError('Ошибка сети — попробуйте ещё раз');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Bot className="w-4 h-4" /> AI-теги фотографий</h3>
          <p className="text-xs text-white/50 mt-0.5">
            Автоматически определяет теги по фото тура
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          aria-label="Сгенерировать AI-теги для фотографий тура"
          className="
            flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
            bg-gradient-to-r from-blue-500/80 to-purple-500/80
            hover:from-blue-500 hover:to-purple-500
            disabled:opacity-50 disabled:cursor-not-allowed
            text-white transition-all duration-200
          "
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Анализирую...
            </>
          ) : (
            <><Sparkles className="w-4 h-4" /> Генерировать теги</>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
          <><AlertTriangle className="w-4 h-4 inline" /> {error}</>
        </div>
      )}

      {tags && (
        <div className="mt-3 space-y-3">
          {tags.landscape.length > 0 && (
            <div>
              <span className="text-xs text-white/40 uppercase tracking-wider">Пейзаж</span>
              <div className="mt-1">
                {tags.landscape.map((t) => <TagBadge key={t} tag={t} />)}
              </div>
            </div>
          )}
          {tags.activity.length > 0 && (
            <div>
              <span className="text-xs text-white/40 uppercase tracking-wider">Активности</span>
              <div className="mt-1">
                {tags.activity.map((t) => <TagBadge key={t} tag={t} />)}
              </div>
            </div>
          )}
          <div>
            <span className="text-xs text-white/40 uppercase tracking-wider">Сложность</span>
            <div className="mt-1">
              <TagBadge tag={tags.difficulty} />
            </div>
          </div>
          {tags.season.length > 0 && (
            <div>
              <span className="text-xs text-white/40 uppercase tracking-wider">Сезон</span>
              <div className="mt-1">
                {tags.season.map((t) => <TagBadge key={t} tag={t} />)}
              </div>
            </div>
          )}
          {tags.features.length > 0 && (
            <div>
              <span className="text-xs text-white/40 uppercase tracking-wider">Особенности</span>
              <div className="mt-1">
                {tags.features.map((t) => <TagBadge key={t} tag={t} />)}
              </div>
            </div>
          )}
          <p className="text-xs text-green-400/70 mt-2 flex items-center gap-1">
            <Check className="w-4 h-4" /> Теги сохранены в базе данных
          </p>
        </div>
      )}
    </div>
  );
}
