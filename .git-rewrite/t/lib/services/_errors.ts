/**
 * Error classes for service layer.
 * Typed exceptions for domain-specific errors.
 */

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
