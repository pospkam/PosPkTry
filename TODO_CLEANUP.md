# Phase 4 Cleanup Tasks (Pending)

## Batch A: Delete Dead Files
- [ ] Delete the `test/` directory (contains old/dummy tests).
- [ ] Delete `tests/api/agent.test.ts` and `tests/api/guide.test.ts` (stub tests).
- *Constraint:* Do NOT touch `migrations/` or `lib/database/`.

## Batch B: Archive Marketplaces
- [ ] Create directory `_archive/marketplaces/`.
- [ ] Move `app/shop/`, `app/gear/`, `app/cars/`, and `app/stay/` to `_archive/marketplaces/`.
- [ ] Remove navigation links to these routes from:
  - Global Header / MobileNav
  - Global Footer
  - `docs/PLATFORM_MAP.md`
- [ ] Clean up unused TypeScript interfaces related to these modules.
- *Constraint:* DO NOT touch `app/hub/stay-provider`, `app/hub/gear-provider`, `app/hub/souvenirs`, `app/hub/cars`.

## Quick Execution Script
Run this in the terminal when at a computer:

```bash
mkdir -p _archive/marketplaces
mv app/shop app/gear app/cars app/stay _archive/marketplaces/ 2>/dev/null || true
rm -rf test/
rm -f tests/api/agent.test.ts tests/api/guide.test.ts
```