## Why

The 3D star map currently loads all stars within 200 ly on startup, resulting in hundreds of undifferentiated points that overwhelm the view and provide no clear context for new users. Users need a curated starting point — the famous stars they already recognize — with explicit controls to expand scope when they want more.

## What Changes

- Zone 1 (nearest view) starts showing only the quick-select famous stars — the same set already shown in the Mission Control quick-select row
- A zone selector UI replaces the automatic radius-based loading, letting users click buttons to load progressively larger star sets ("Famous Only", "Naked Eye", "Binocular", "Full Catalog")
- Each zone level fetches incrementally from the backend; previously loaded stars are kept in view
- The current hardcoded `max_mag=8` fetch is removed in favor of this explicit zone system

## Capabilities

### New Capabilities
- `star-zone-selector`: UI controls in the 3D map overlay that let users choose how many stars to display, with named tiers tied to catalog subsets

### Modified Capabilities
- (none — no existing specs)

## Impact

- `frontend/src/components/StarMap3D.tsx`: Zone 1 fetch logic, new ZoneSelectorOverlay component
- `backend/routers/stars.py`: `max_mag` parameter already added; no further backend changes needed
- No breaking API changes
