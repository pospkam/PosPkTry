/**
 * OCTO API — Mappers
 * Transform DB rows into OCTO-spec JSON responses
 * Prices in smallest currency unit (kopecks for RUB = amount * 100)
 * Timezone: Asia/Kamchatka (UTC+12)
 */

const TIMEZONE = 'Asia/Kamchatka';
const CURRENCY = 'RUB';

// --- Types for DB rows ---

interface SupplierRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contacts: Record<string, unknown> | null;
}

interface ProductRow {
  id: string | number;
  title: string;
  description: string | null;
  location_type: string | null;
  activity_type: string | null;
  base_price: string | number | null;
  duration_hours: number | null;
  season_start: string | null;
  season_end: string | null;
  latitude: number | null;
  longitude: number | null;
  partner_name: string | null;
  partner_id: string | null;
}

interface OptionRow {
  id: string | number;
  internal_name: string;
  is_default: boolean;
  price_adult: string | number | null;
  price_child: string | number | null;
  price_youth: string | number | null;
  max_units: number | null;
  min_units: number;
  restrictions: Record<string, unknown>;
}

interface AvailabilityRow {
  date: string;
  available_slots: number | null;
  booked_slots: number;
  base_price_override: string | number | null;
  base_price: string | number | null;
}

interface BookingRow {
  id: string | number;
  octo_uuid: string;
  booking_status: string;
  tour_title: string;
  option_name: string | null;
  option_id: string | number | null;
  operator_tour_id: string | number;
  booking_date: string;
  participants: number;
  adult_count: number | null;
  child_count: number | null;
  final_price: string | number | null;
  currency: string;
  tourist_name: string | null;
  tourist_email: string | null;
  tourist_phone: string | null;
  special_requests: string | null;
  hold_expires_at: string | null;
  created_at: string;
  updated_at: string | null;
}

// --- Helpers ---

function toKopecks(amount: string | number | null): number {
  if (amount === null || amount === undefined) return 0;
  return Math.round(Number(amount) * 100);
}

function formatLocalDate(dateStr: string): string {
  // Ensure YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return new Date(dateStr).toISOString().slice(0, 10);
}

function mapBookingStatus(dbStatus: string, holdExpiresAt?: string | null): string {
  if (dbStatus === 'new' && holdExpiresAt && new Date(holdExpiresAt) < new Date()) {
    return 'EXPIRED';
  }
  switch (dbStatus) {
    case 'new': return 'ON_HOLD';
    case 'confirmed': return 'CONFIRMED';
    case 'cancelled': return 'CANCELLED';
    case 'completed': return 'REDEEMED';
    case 'no_show': return 'NO_SHOW';
    default: return 'ON_HOLD';
  }
}

// --- Mappers ---

export function mapSupplier(row: SupplierRow) {
  return {
    id: row.id,
    name: row.name,
    endpoint: `https://tourhab.ru/api/octo`,
    contact: {
      website: `https://tourhab.ru/operators/${row.slug}`,
      email: (row.contacts as Record<string, string>)?.email ?? null,
      telephone: (row.contacts as Record<string, string>)?.phone ?? null,
    },
    timezone: TIMEZONE,
    country: 'RU',
  };
}

export function mapProduct(row: ProductRow, options: OptionRow[]) {
  return {
    id: String(row.id),
    internalName: row.title,
    locale: 'ru',
    timeZone: TIMEZONE,
    instantConfirmation: true,
    instantDelivery: false,
    availabilityRequired: true,
    availabilityType: 'START_TIME',
    deliveryFormats: ['QR_CODE'],
    deliveryMethods: ['VOUCHER'],
    redemptionMethod: 'MANIFEST',
    options: options.map(mapOption),
    location: row.latitude && row.longitude ? {
      latitude: row.latitude,
      longitude: row.longitude,
    } : null,
    content: {
      title: row.title,
      description: row.description ?? '',
      categories: [row.activity_type, row.location_type].filter(Boolean),
      duration: row.duration_hours ? `PT${row.duration_hours}H` : null,
    },
    supplier: row.partner_id ? {
      id: row.partner_id,
      name: row.partner_name ?? '',
    } : null,
  };
}

export function mapOption(row: OptionRow) {
  const units = [
    {
      id: 'ADULT',
      internalName: 'Adult',
      type: 'ADULT',
      pricingFrom: row.price_adult ? [{
        currency: CURRENCY,
        amount: toKopecks(row.price_adult),
        currencyPrecision: 2,
      }] : [],
    },
    {
      id: 'CHILD',
      internalName: 'Child',
      type: 'CHILD',
      pricingFrom: row.price_child ? [{
        currency: CURRENCY,
        amount: toKopecks(row.price_child),
        currencyPrecision: 2,
      }] : [],
    },
    {
      id: 'YOUTH',
      internalName: 'Youth',
      type: 'YOUTH',
      pricingFrom: row.price_youth ? [{
        currency: CURRENCY,
        amount: toKopecks(row.price_youth),
        currencyPrecision: 2,
      }] : [],
    },
  ];

  return {
    id: String(row.id),
    default: row.is_default,
    internalName: row.internal_name,
    restrictions: {
      minUnits: row.min_units,
      maxUnits: row.max_units,
      ...row.restrictions,
    },
    units,
  };
}

export function mapAvailability(
  row: AvailabilityRow,
  productId: string,
  optionId: string,
  dynamicPrice?: number | null
) {
  const slots = row.available_slots;
  const booked = Number(row.booked_slots ?? 0);
  const remaining = slots !== null ? Math.max(0, slots - booked) : null;
  // Priority: dynamic price > slot override > base price
  const price = dynamicPrice ?? row.base_price_override ?? row.base_price;

  let status: string;
  if (remaining === null) {
    status = 'FREESALE';
  } else if (remaining <= 0) {
    status = 'SOLD_OUT';
  } else if (remaining <= 3) {
    status = 'LIMITED';
  } else {
    status = 'AVAILABLE';
  }

  return {
    id: `${productId}-${optionId}-${formatLocalDate(row.date)}`,
    localDate: formatLocalDate(row.date),
    status,
    vacancies: remaining,
    capacity: slots,
    utcCutoffAt: `${formatLocalDate(row.date)}T21:00:00Z`, // midnight Kamchatka = 12:00 UTC previous day
    openingHours: [{
      from: '08:00',
      to: '20:00',
    }],
    pricing: price ? {
      currency: CURRENCY,
      amount: toKopecks(price),
      currencyPrecision: 2,
    } : null,
  };
}

export function mapFreesaleAvailability(
  date: string,
  productId: string,
  optionId: string,
  basePrice: string | number | null,
  dynamicPrice?: number | null
) {
  return {
    id: `${productId}-${optionId}-${date}`,
    localDate: date,
    status: 'FREESALE',
    vacancies: null,
    capacity: null,
    utcCutoffAt: `${date}T21:00:00Z`,
    openingHours: [{
      from: '08:00',
      to: '20:00',
    }],
    pricing: (dynamicPrice ?? basePrice) ? {
      currency: CURRENCY,
      amount: toKopecks(dynamicPrice ?? basePrice),
      currencyPrecision: 2,
    } : null,
  };
}

// Calendar endpoint returns one simplified entry per day (no id, no cutoff)
export function mapCalendarDay(
  row: AvailabilityRow,
  _productId: string,
  _optionId: string
) {
  const slots = row.available_slots;
  const booked = Number(row.booked_slots ?? 0);
  const remaining = slots !== null ? Math.max(0, slots - booked) : null;

  let status: string;
  if (remaining === null) {
    status = 'FREESALE';
  } else if (remaining <= 0) {
    status = 'SOLD_OUT';
  } else if (remaining <= 3) {
    status = 'LIMITED';
  } else {
    status = 'AVAILABLE';
  }

  return {
    localDate: formatLocalDate(row.date),
    available: status !== 'SOLD_OUT',
    status,
    vacancies: remaining,
    capacity: slots,
    openingHours: [{ from: '08:00', to: '20:00' }],
  };
}

export function mapFreesaleCalendarDay(date: string) {
  return {
    localDate: date,
    available: true,
    status: 'FREESALE',
    vacancies: null,
    capacity: null,
    openingHours: [{ from: '08:00', to: '20:00' }],
  };
}

export function mapBooking(row: BookingRow) {
  return {
    id: row.octo_uuid,
    status: mapBookingStatus(row.booking_status, row.hold_expires_at),
    productId: String(row.operator_tour_id),
    optionId: row.option_id ? String(row.option_id) : 'default',
    availabilityId: `${row.operator_tour_id}-${row.option_id ?? 'default'}-${formatLocalDate(row.booking_date)}`,
    contact: {
      fullName: row.tourist_name,
      emailAddress: row.tourist_email,
      phoneNumber: row.tourist_phone,
    },
    unitItems: Array.from({ length: row.participants }, (_, i) => ({
      uuid: `${row.octo_uuid}-unit-${i}`,
      unitId: i < (row.adult_count ?? row.participants) ? 'ADULT' : 'CHILD',
    })),
    utcCreatedAt: row.created_at,
    utcUpdatedAt: row.updated_at ?? row.created_at,
    utcExpiresAt: row.hold_expires_at,
    utcRedeemedAt: row.booking_status === 'completed' ? row.updated_at : null,
    notes: row.special_requests,
    pricing: {
      currency: CURRENCY,
      total: toKopecks(row.final_price),
      currencyPrecision: 2,
    },
  };
}
