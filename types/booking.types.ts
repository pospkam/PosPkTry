/**
 * Типы для системы бронирований Kamchatour Hub
 * Расширенная бизнес-логика: статусы, отмены, возвраты, логирование
 */

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'               // обратная совместимость со старыми записями
  | 'cancelled_by_tourist'
  | 'cancelled_by_operator'
  | 'refunded';

/** Статусы, считающиеся терминальными (нельзя менять) */
export const TERMINAL_STATUSES: ReadonlySet<BookingStatus> = new Set([
  'completed',
  'refunded',
]);

/** Статусы отмены (можно перейти только в refunded) */
export const CANCELLED_STATUSES: ReadonlySet<BookingStatus> = new Set([
  'cancelled',
  'cancelled_by_tourist',
  'cancelled_by_operator',
]);

/**
 * Разрешенные переходы статусов
 * Ключ — текущий статус, значение — массив допустимых следующих статусов
 */
export const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'cancelled_by_tourist', 'cancelled_by_operator'],
  confirmed: ['completed', 'cancelled_by_tourist', 'cancelled_by_operator'],
  completed: [],
  cancelled: ['refunded'],
  cancelled_by_tourist: ['refunded'],
  cancelled_by_operator: ['refunded'],
  refunded: [],
} as const;

export interface RefundResult {
  /** Процент возврата: 0, 50 или 100 */
  percent: number;
  /** Сумма к возврату в рублях */
  amount: number;
  /** Текстовое объяснение */
  reason: string;
}

export interface BookingLogEntry {
  id: string;
  bookingId: string;
  fromStatus: BookingStatus;
  toStatus: BookingStatus;
  changedBy: string;
  comment: string | null;
  createdAt: Date;
}

export interface BookingWithDetails {
  id: string;
  status: BookingStatus;
  tour: {
    id: string;
    title: string;
    price: number;
  };
  tourist: {
    id: string;
    name: string;
    email: string;
  };
  date: Date;
  participants: number;
  totalAmount: number;
  refundAmount: number | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  specialRequests: string | null;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  logs: BookingLogEntry[];
}

export interface CreateBookingInput {
  tourId: string;
  date: string;
  participants: number;
  specialRequests?: string;
  /** UUID заезда из tour_departures (если бронь через календарь заездов) */
  departureId?: string;
}

export interface RescheduleBookingInput {
  targetTourId: string;
  targetDate: string;
  participants?: number;
  comment?: string;
}

export interface CancelBookingResult {
  booking: BookingWithDetails;
  refund: RefundResult;
}
