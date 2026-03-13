/**
 * Shared helper functions and error classes used across service modules.
 */

import { pool } from '@/lib/db-pool';

// Re-export pool for use by service modules
export { pool };

// ========================================
// Error Classes
// ========================================

export class TourNotFoundError extends Error {
  constructor(id?: string) {
    super(id ? `Tour not found: ${id}` : 'Tour not found');
    this.name = 'TourNotFoundError';
  }
}

export class TourValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TourValidationError';
  }
}

export class TourAlreadyPublishedError extends Error {
  constructor(id?: string) {
    super(id ? `Tour already published: ${id}` : 'Tour already published');
    this.name = 'TourAlreadyPublishedError';
  }
}

export class ReviewNotFoundError extends Error {
  constructor(id?: string) {
    super(id ? `Review not found: ${id}` : 'Review not found');
    this.name = 'ReviewNotFoundError';
  }
}

export class ReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewValidationError';
  }
}

export class DuplicateReviewError extends Error {
  constructor(message = 'Review already exists') {
    super(message);
    this.name = 'DuplicateReviewError';
  }
}

// ========================================
// Type Conversion Helpers
// ========================================

export function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toBooleanOrNull(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return null;
}
