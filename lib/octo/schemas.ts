/**
 * OCTO API — Zod validation schemas
 * Based on OCTO spec: availability check, booking create/confirm/cancel
 */

import { z } from 'zod';

// --- Unit types ---

const UnitItemSchema = z.object({
  unitId: z.enum(['ADULT', 'CHILD', 'YOUTH']),
});

// Stricter unit item validation for bookings
const BookingUnitItemSchema = z.object({
  unitId: z.enum(['ADULT', 'CHILD', 'YOUTH']),
});

// Helper to check if array has at least one ADULT
const hasAtLeastOneAdult = (items: Array<{ unitId: string }>) =>
  items.some(item => item.unitId === 'ADULT');

// --- Availability ---

export const AvailabilityCheckSchema = z.object({
  productId: z.string().min(1),
  optionId: z.string().min(1),
  localDateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  localDateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  units: z.array(UnitItemSchema).optional(),
});

// --- Booking ---

// Contact validation: fullName required, and at least email OR phone (OCTO requirement)
const ContactSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required'),
    emailAddress: z.string().email().optional(),
    phoneNumber: z.string().optional(),
    locales: z.array(z.string()).optional(),
    country: z.string().optional(),
  })
  .refine(
    data => data.emailAddress || data.phoneNumber,
    'At least email address or phone number is required'
  );

export const BookingCreateSchema = z
  .object({
    productId: z.string().min(1),
    optionId: z.string().min(1),
    availabilityId: z.string().min(1),
    unitItems: z.array(BookingUnitItemSchema).min(1).max(50),
    contact: ContactSchema, // Required for OTA integration
    resellerReference: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    data => hasAtLeastOneAdult(data.unitItems),
    'At least one ADULT unit item is required'
  );

export const BookingConfirmSchema = z.object({
  resellerReference: z.string().optional(),
  contact: ContactSchema.optional(),
});

export const BookingCancelSchema = z.object({
  reason: z.string().optional(),
});

// --- Admin: API key management ---

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  operatorId: z.string().uuid().optional(),
  canReadProducts: z.boolean().optional().default(true),
  canReadAvailability: z.boolean().optional().default(true),
  canCreateBookings: z.boolean().optional().default(true),
  rateLimitPerMinute: z.number().int().min(1).max(10000).optional().default(60),
  notes: z.string().optional(),
});

export const UpdateApiKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
  canReadProducts: z.boolean().optional(),
  canReadAvailability: z.boolean().optional(),
  canCreateBookings: z.boolean().optional(),
  rateLimitPerMinute: z.number().int().min(1).max(10000).optional(),
  notes: z.string().optional(),
});
