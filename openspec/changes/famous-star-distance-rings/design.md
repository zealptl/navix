## Context

The star map already renders famous stars in Zone 1 as instanced mesh sprites with labels via `@react-three/drei`'s `Html`. The scene uses Three.js world units equal to light-years (HYG parsecs × 3.26156). The galactic plane is y = 0. `distance_ly` is already returned for every star by `/api/stars/famous`.

The existing `PulsingRing` component demonstrates the pattern: a `Billboard` + `ringGeometry` + `meshBasicMaterial` already works in this scene. The new `DistanceRings` component extends this pattern to galactic-plane rings.

## Goals / Non-Goals

**Goals:**
- One flat ring per famous star on the galactic plane (y = 0), radius = `distance_ly`
- Faint vertical drop-line from the ring point directly below each star up to the star's 3D position
- Text label on each ring (star name + distance) with angular staggering to avoid collisions between close-radius rings
- Rings fade out with Zone 1 opacity (same `smoothstep(100, 300, cameraDistance)` used elsewhere)
- Toggle button to show/hide all rings; state lives in local React state inside `StarMap3D`

**Non-Goals:**
- Rings for non-famous stars
- Rings beyond Zone 1 camera range (Polaris, Betelgeuse) — skip rings for stars with `distance_ly > 100`
- Animating or pulsing the rings (static opacity only)
- Persisting the toggle to the Zustand store

## Decisions

### 1. Galactic-plane rings (y = 0), not rings tilted through the star

**Decision**: All rings lie flat on y = 0, independent of the star's actual elevation.

**Rationale**: Tilting each ring to pass through the star's 3D position would require a unique quaternion per ring and the rings would each be in different planes — visually noisy and harder to read comparatively. Flat rings on the galactic plane act like concentric contours on a map; the drop-line connects the ring to the star's true position, preserving the 3D information without visual chaos.

**Alternative considered**: Great-circle rings through each star + Earth. Rejected — overlapping tilted rings are hard to read; staggering labels becomes much harder.

### 2. Drop-line as a `Line` from (starX, 0, starZ) → (starX, starY, starZ)

**Decision**: A single `<Line>` segment from the galactic-plane projection of the star down to the star itself.

**Rationale**: Gives immediate visual cue of galactic elevation. Most famous nearby stars are within ±50 ly of the plane so the lines will be short but visible. Uses `@react-three/drei`'s `Line` which is already imported.

**Implementation note**: If `star.y * PC_TO_LY` is near 0 (< 0.1 ly), skip the drop-line to avoid a zero-length segment.

### 3. Label placed at the outermost ring point in the +Z direction, with angular offset for collision avoidance

**Decision**: Default label anchor is at `(0, 0, distance_ly)` (world +Z). Stars whose rings are within 0.5 ly of each other in radius get their labels rotated by 45° increments around the ring to separate them.

**Rationale**: +Z is the "front" of the default camera view. Rotating only the label (not the ring) keeps the rings visually clean. The 0.5 ly collision threshold catches the Proxima/Alpha Cen pair (4.24 vs 4.37 ly) which are the only stars likely to collide at this precision.

### 4. Toggle in Zone 1 control area (local state, not Zustand)

**Decision**: A `showRings` boolean in `useState` inside the `StarMap3D` component. Toggle button sits alongside the existing zone-tier buttons.

**Rationale**: Ring visibility is a pure display preference that doesn't affect physics calculations, playback, or star selection — no reason to push it to the global store. Local state is simpler and avoids unnecessary re-subscriptions.

### 5. Skip rings for stars with distance_ly > 100

**Decision**: Famous stars beyond 100 ly (Polaris ~433 ly, Betelgeuse ~640 ly, etc.) do not get rings.

**Rationale**: A ring of radius 430 ly on the galactic plane would dwarf the entire Zone 1 star field and be nearly invisible at typical Zone 1 camera distances (< 100 ly from origin). The point of the feature is to show relative nearby distances; those distant stars are better understood as outliers in the Zone 2/3 context.

## Risks / Trade-offs

**[Risk] Ring geometry segments look faceted at large radii** → Mitigation: Use 128 segments for `RingGeometry` (default is 32). At radius 25 ly with 128 segments the arc between vertices is < 1 ly — imperceptible.

**[Risk] Html labels in R3F always face the camera but can overlap at shallow viewing angles** → Mitigation: Labels use `@react-three/drei`'s `Html` with `occlude` disabled; the angular staggering handles the main collision case (Proxima/Alpha Cen). Accept minor overlap at extreme roll angles — the rings are supplementary context, not primary UI.

**[Risk] Performance: adding 15 ring meshes + 15 Html labels** → Mitigation: All ring geometries are static (created once in `useMemo`). Html labels are React DOM, not Three.js — 15 labels is negligible. No `useFrame` per ring needed; opacity driven by a single shared ref.

## Migration Plan

Frontend-only change. No database or API changes. Deploy by rebuilding the Vite frontend.
