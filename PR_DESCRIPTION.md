# PR: Merge cursor/timeweb-69fd into main

This pull request merges all development work from the `cursor/timeweb-69fd` branch into `main`.

## Summary  

This PR consolidates development work bringing comprehensive improvements to the Kamhub platform.

## Key Changes

### SEO & Metadata
- Comprehensive SEO metadata with OpenGraph and Twitter Cards
- Keywords optimization for Kamchatka tourism  
- Social sharing configurations

### UI & Components
- Enhanced home page layout with improved metadata
- Improved TourCard component design
- Better theme configuration in Tailwind
- Removed outdated UI components (BottomNav, Header, CategoryIcon, KamchatourHome)

### Infrastructure
- Auth, Role, and Orders context providers
- Timeweb Cloud Apps deployment configurations
- Removed unused Deno workflow

## Files Changed

### Modified
- `app/layout.tsx` - Added comprehensive SEO metadata and context providers
- `app/page.tsx` - Enhanced home page implementation
- `components/TourCard.tsx` - Improved tour card component
- `tailwind.config.ts` - Enhanced theme configuration

### Deleted
- `.github/workflows/deno.yml` - Removed unused workflow
- `components/BottomNav.tsx` - Removed outdated component
- `components/CategoryIcon.tsx` - Removed outdated component
- `components/Header.tsx` - Removed outdated component
- `components/KamchatourHome.tsx` - Removed outdated component

## Testing

Changes tested for:
- No TypeScript errors in modified files
- Clean build process
- Proper context provider integration

## Deployment

Production: https://pospk-kamhub-c8e0.twc1.net
