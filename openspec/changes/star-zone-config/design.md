## Context

Zone 1 currently fetches all stars within 200 ly with `max_mag=8` on mount, returning ~500–800 points. The view is still cluttered for first-time users and there's no user control over density. The quick-select row already curates a set of ~20 famous stars — these are exactly the stars a new user should see first.

The backend `nearby` endpoint already accepts `max_mag` and `is_famous` filtering via the SQL WHERE clause added in the previous change. No backend work is needed.

## Goals / Non-Goals

**Goals:**
- Default Zone 1 view shows only famous stars (same set as quick-select)
- User can expand to larger star sets via a button group overlay on the map
- Zone tiers are named, not numeric, so the UI is self-explanatory
- Previously loaded data is preserved when expanding to a higher tier (no flash/reload)

**Non-Goals:**
- Persisting the selected zone across sessions
- Configuring zone radii or magnitude cutoffs from the UI
- Changing Zone 2 (Orion Arm point cloud) or Zone 3 (galaxy) behavior

## Decisions

### Zone tiers as named presets, not a slider

**Decision**: Four named buttons — Famous, Naked Eye (mag ≤ 6.5), Binocular (mag ≤ 8), All Nearby — rather than a free radius/magnitude slider.

**Rationale**: Named tiers are immediately legible. A slider invites confusion about units. Four levels cover the meaningful astronomical breakpoints: curated famous, unaided eye, optical aid, full catalog.

**Alternative considered**: Numeric radius selector (50 ly / 100 ly / 200 ly). Rejected because radius alone doesn't reduce clutter — faint nearby stars are the problem, not the radius.

### Fetch-on-demand, additive merging

**Decision**: Each tier triggers a new `fetch('/api/stars/nearby?...')`. Results are merged into the existing stars array (deduped by `id`) so switching from Famous → Naked Eye doesn't re-flash already-visible stars.

**Alternative considered**: Fetch all tiers upfront. Rejected — the full nearby set (~800 stars) is non-trivial to load eagerly.

### Placement: top-left overlay on the canvas

**Decision**: Zone selector sits as an absolute-positioned overlay in the top-left of the `StarMap3D` container (Reset View button stays top-right).

**Rationale**: Keeps the control adjacent to what it affects without adding a new panel section to Mission Control, which is already vertically dense.

## Risks / Trade-offs

- [Merging arrays on every tier change] → Deduplicate by `id` with a Map before setting state; negligible cost at these counts.
- [Famous-only default hides some origin/destination stars] → Any star reachable via search or click in the 3D map will work regardless of zone; zone only affects visual density, not selectability of stars that are loaded.

## Migration Plan

No data migration. Frontend-only change beyond the already-shipped `max_mag` backend param. Deploy frontend build; rollback by reverting the StarMap3D fetch call to the previous hardcoded URL.
