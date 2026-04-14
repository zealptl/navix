## Why

The 3D star map shows famous stars as labeled dots but gives no intuitive sense of their relative distances from Earth — all stars look equidistant until the user manually reads a number. Concentric distance-shell rings centered on the Sun, one per famous star, make the scale relationships immediately visible.

## What Changes

- A new `DistanceRings` R3F component renders a thin circular ring on the galactic plane (y = 0) for each famous star, with radius equal to `distance_ly`
- A faint vertical drop-line connects each ring to the star's actual 3D position, revealing galactic elevation
- Each ring is labeled with the star's name and distance (e.g. `Sirius  8.6 ly`)
- Labels for rings at nearly identical radii (e.g. Proxima 4.24 ly / Alpha Cen 4.37 ly) are staggered angularly so they don't collide
- Rings fade with the Zone 1 LOD (same `smoothstep` 100–300 ly camera distance)
- A toggle button in the existing zone-tier controls area shows/hides all rings
- No backend changes — `distance_ly` is already returned by `/api/stars/famous`

## Capabilities

### New Capabilities
- `distance-rings`: Galactic-plane distance-shell rings for famous stars, with drop-lines, labels, LOD fade, and a show/hide toggle

### Modified Capabilities
<!-- none -->

## Impact

- **Frontend only** — no backend or data changes
- `frontend/src/components/StarMap3D.tsx` — new `DistanceRings` component added to the scene; toggle state threaded through props or a local React state in the parent `StarMap3D`
- `frontend/src/store.ts` — optional: add `showDistanceRings: boolean` if the toggle should persist across re-renders (otherwise local state suffices)
- No new npm dependencies — `RingGeometry`, `Line`, and `Html` from Three.js / `@react-three/drei` are already in use
