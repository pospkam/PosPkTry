import { describe, it, expect } from 'vitest';
import { classifyIntentByKeywords } from '../intent-classifier';

describe('classifyIntentByKeywords', () => {
  // ── Admin intents ──────────────────────────────────────────────────────────

  describe('admin intents (role=admin)', () => {
    it('recognises "дайджест"', () => {
      expect(classifyIntentByKeywords('дайджест', 'admin')).toBe('admin_digest');
    });

    it('recognises mixed case "Digest"', () => {
      expect(classifyIntentByKeywords('Дай мне Digest', 'admin')).toBe('admin_digest');
    });

    it('recognises "итоги" in a sentence', () => {
      expect(classifyIntentByKeywords('покажи итоги за неделю', 'admin')).toBe('admin_digest');
    });

    it('recognises "лиды"', () => {
      expect(classifyIntentByKeywords('сколько лидов пришло сегодня', 'admin')).toBe('admin_leads');
    });

    it('recognises "диагностика"', () => {
      expect(classifyIntentByKeywords('запусти диагностика', 'admin')).toBe('admin_health');
    });
  });

  // ── Admin intents blocked for non-admins ──────────────────────────────────

  describe('admin intents blocked for non-admin roles', () => {
    it('returns unknown for "дайджест" with operator role', () => {
      expect(classifyIntentByKeywords('дайджест', 'operator')).toBe('unknown');
    });

    it('returns unknown for "лиды" with tourist role', () => {
      expect(classifyIntentByKeywords('лиды', 'tourist')).toBe('unknown');
    });
  });

  // ── Operator intents ───────────────────────────────────────────────────────

  describe('operator intents (role=operator)', () => {
    it('recognises "мои туры"', () => {
      expect(classifyIntentByKeywords('покажи мои туры', 'operator')).toBe('op_tours_summary');
    });

    it('recognises "выручка"', () => {
      expect(classifyIntentByKeywords('какая у меня выручка за месяц?', 'operator')).toBe('op_revenue');
    });

    it('recognises "бронирования сегодня"', () => {
      expect(classifyIntentByKeywords('бронирования сегодня есть?', 'operator')).toBe('op_bookings_today');
    });
  });

  // ── Operator intents also accessible for admin ────────────────────────────

  describe('operator intents accessible for admin', () => {
    it('admin can query operator revenue', () => {
      expect(classifyIntentByKeywords('выручка оператора', 'admin')).toBe('op_revenue');
    });
  });

  // ── Tourist intents ────────────────────────────────────────────────────────

  describe('tourist intents (role=tourist)', () => {
    it('recognises "вулкан"', () => {
      expect(classifyIntentByKeywords('хочу посмотреть вулкан', 'tourist')).toBe('tourist_recommend');
    });

    it('recognises "рыбалка"', () => {
      expect(classifyIntentByKeywords('Интересует рыбалка на Камчатке', 'tourist')).toBe('tourist_recommend');
    });

    it('recognises "горячие источники"', () => {
      expect(classifyIntentByKeywords('есть горячие источники?', 'tourist')).toBe('tourist_recommend');
    });

    it('recognises "рекомендуй тур"', () => {
      expect(classifyIntentByKeywords('рекомендуй тур для меня', 'tourist')).toBe('tourist_recommend');
    });
  });

  // ── Unknown ────────────────────────────────────────────────────────────────

  describe('unknown intent', () => {
    it('returns unknown for unmatched message', () => {
      expect(classifyIntentByKeywords('привет', 'tourist')).toBe('unknown');
    });

    it('returns unknown for empty string', () => {
      expect(classifyIntentByKeywords('', 'admin')).toBe('unknown');
    });

    it('returns unknown when no role given and tourist keywords present', () => {
      // No role → operator intents blocked, admin intents blocked, tourist intents pass
      expect(classifyIntentByKeywords('хочу тур с вулканами')).toBe('tourist_recommend');
    });
  });
});
