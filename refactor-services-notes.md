# Refactor Services Notes

## Summary

The monolithic `lib/services.ts` (2687 lines) has been split into **17 domain-specific service files** under `lib/services/`. An `index.ts` barrel file re-exports all services for backward compatibility.

## TypeScript Check Results (`tsc --noEmit`)

**0 errors in `lib/services/` files** — all new service modules compile cleanly.

The 17 pre-existing TypeScript errors remain unchanged (they are **not** caused by this refactoring):

| File | Line | Error Code | Description |
| :--- | :---: | :--- | :--- |
| `app/partner/tours/add/_AddTourPageClient.tsx` | 417 | TS2607, TS2786 | `Image` cannot be used as JSX component |
| `components/admin/shared/DataTable.tsx` | 64 | TS18046 | `aValue`/`bValue` is of type `unknown` |
| `lib/auth/gear-helpers.ts` | 260, 356, 418 | TS2322, TS2345 | `null` not assignable / wrong argument type |
| `lib/auth/guide-helpers.ts` | 295, 373 | TS2322 | `null` not assignable to `Record<string, unknown>` |
| `lib/auth/tourist-helpers.ts` | 126, 204, 206, 247, 274 | TS18046, TS2339, TS2345, TS2322 | `unknown` type / missing property / null assignment |
| `lib/auth/transfer-helpers.ts` | 350, 397 | TS2322 | `null` not assignable to `Record<string, unknown>` |
| `lib/monitoring.ts` | 58 | TS2352 | Unsafe type conversion of `Console` |

## ESLint Check Results (`next lint`)

**0 warnings/errors in `lib/services/` files** — all new service modules pass linting.

Pre-existing ESLint issues (not caused by this refactoring) remain in:
- `components/shared/ModernTourSearch.tsx` — missing display name, missing hook dependencies
- `components/shared/YandexMap.tsx` — missing hook dependency
- `components/transfer-operator/` — missing hook dependencies
- `components/weather/WeatherWidget.tsx` — missing hook dependency
- Various `<img>` usage warnings (should use `next/image`)

## Files Created

| File | Domain | Key Exports |
| :--- | :--- | :--- |
| `lib/services/_helpers.ts` | Shared | `pool`, `toStringOrNull`, `toNumberOrNull`, `toBooleanOrNull`, error classes |
| `lib/services/tour.service.ts` | Tours | `tourService` |
| `lib/services/review.service.ts` | Reviews | `reviewService` |
| `lib/services/booking.service.ts` | Bookings | `bookingService`, `availabilityService` |
| `lib/services/agent.service.ts` | Agents | `agentService` |
| `lib/services/partner.service.ts` | Partners | `partnerService` |
| `lib/services/commission.service.ts` | Commissions | `commissionService` |
| `lib/services/dashboard.service.ts` | Dashboard | `dashboardService` |
| `lib/services/feedback.service.ts` | Feedback | `feedbackService` |
| `lib/services/knowledge-base.service.ts` | Knowledge Base | `knowledgeBaseService` |
| `lib/services/messaging.service.ts` | Messaging | `messagingService` |
| `lib/services/metrics.service.ts` | Metrics | `metricsService` |
| `lib/services/notification.service.ts` | Notifications | `notificationService` |
| `lib/services/payout.service.ts` | Payouts | `payoutService` |
| `lib/services/report.service.ts` | Reports | `reportService` |
| `lib/services/search.service.ts` | Search | `searchService` |
| `lib/services/sla.service.ts` | SLA | `slaService` |
| `lib/services/ticket-message.service.ts` | Ticket Messages | `ticketMessageService` |
| `lib/services/index.ts` | Barrel | Re-exports all services |

## Files Modified

| File | Change |
| :--- | :--- |
| `lib/database.ts` | Updated re-export path from `@/lib/services` to `@/lib/services/index` |

## Import Compatibility

All 215 API routes import services through `@/lib/database`, which now re-exports from `@/lib/services/index`. **No API route files needed modification.**

## Recommended Next Steps

1. **Delete old `lib/services.ts`** after confirming all tests pass on this branch
2. **Gradually migrate API routes** to import directly from domain-specific service files (e.g., `@/lib/services/tour.service`) instead of through `@/lib/database`
3. **Fix the 17 pre-existing TypeScript errors** listed above (separate PR recommended)
4. **Add unit tests** for individual service modules
5. **Remove stub/placeholder implementations** and connect to real business logic
