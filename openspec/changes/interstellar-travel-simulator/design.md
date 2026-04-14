## Context

Greenfield web application. No existing codebase. The app simulates relativistic interstellar travel with a 3D star map, physics engine, and animated playback. The physics are grounded in Special Relativity (Rindler equations for constant proper acceleration). Star position data comes from the HYG stellar catalog (~119k stars with real x/y/z coordinates in parsecs).

The central design tension: physics calculations must feel instantaneous (sliders update results in real-time) while star data needs a queryable backend (full-text search across 119k stars). This drives the split between a client-side physics engine and a server-side star database.

## Goals / Non-Goals

**Goals:**
- Scientifically accurate relativistic trip profiles (proper time, coordinate time, velocity, Lorentz factor)
- 3D star map with three LOD zones that transitions smoothly as user zooms
- Real-time parameter interactivity — all physics results update as sliders move
- Animated playback scrubbing through ship proper time with ship moving on 3D map and dual clocks diverging
- Star search backed by a real database (FTS over 119k stars)
- Mass ratio display across propulsion types to communicate the fuel problem

**Non-Goals:**
- Gravitational effects, orbital mechanics, gravity assists
- N-body simulation
- Multiplayer or shared sessions
- Mobile-first layout (desktop web primary)
- General relativity (acceleration fields, black holes)
- Actual mission planning tooling (no export, no save state)

## Decisions

### 1. Physics engine runs client-side in TypeScript

**Decision**: All relativistic calculations in TypeScript, in the browser. No physics API endpoint.

**Rationale**: The Rindler equations are closed-form — `sinh`, `cosh`, `tanh`, `atanh`, `acosh` — all available natively in `Math.*` since ES6. No numerical integration needed. A server round-trip on every slider drag would introduce 50–200ms latency, destroying the real-time feel. Client-side physics means zero latency on parameter changes.

**Alternative considered**: Python + scipy on FastAPI. Rejected because scipy provides no benefit for closed-form equations and introduces per-interaction API latency.

### 2. FastAPI + SQLite for star data

**Decision**: Python FastAPI backend with SQLite database seeded from HYG CSV at startup.

**Rationale**: HYG has 119k stars. Full-text search, distance filtering, and curated rankings need SQL. SQLite is zero-infrastructure (single file), sufficient for read-heavy query patterns with no concurrent writes. FastAPI provides async endpoints with minimal boilerplate.

**Alternative considered**: IndexedDB in the browser. Rejected — clunky seeding from CSV, limited query expressiveness, poor dev experience.

**Alternative considered**: Static JSON files. Rejected — no real search, in-memory filtering of 119k records in JS is wasteful.

### 3. React Three Fiber for 3D map

**Decision**: React Three Fiber (R3F) + @react-three/drei as the 3D layer.

**Rationale**: R3F makes Three.js React-native — star layers, trajectories, and controls become JSX components that sync naturally with Zustand state. Drei provides `OrbitControls`, `Html` (floating labels), `Line` (trajectory), and `Points` (star clouds) out of the box.

**Alternative considered**: Raw Three.js with imperative code. Rejected — harder to sync with React state, more boilerplate for camera controls.

### 4. Three-zone LOD with opacity crossfades

**Decision**: Three always-mounted scene layers (Zone 1: individual stars <200ly, Zone 2: point cloud <10klv, Zone 3: procedural galaxy) with opacity driven by `smoothstep(camera.distance)` in `useFrame`.

**Rationale**: Mount/unmount on zoom threshold would cause frame drops and pop. Keeping all three layers alive and fading opacity is cheap (one float per frame per layer) and eliminates visible transitions.

**Zone boundaries**:
- Zone 1 fully visible: < 100 ly; fully faded: > 300 ly
- Zone 2 fully visible: 200 ly–5k ly; fades at edges
- Zone 3 fully visible: > 8k ly; fully faded: < 4k ly

### 5. Ship proper time τ as the scrubber axis

**Decision**: The playback scrubber represents ship proper time (τ), not Earth coordinate time (t).

**Rationale**: Proper time advances linearly for the crew — the scrubber feels proportional to journey progress. Earth coordinate time grows non-linearly (slowly when γ≈1, fast during high-γ coast). Scrubbing by τ makes the Earth clock appear to accelerate mid-journey, which is exactly the visceral effect we want to show.

### 6. Zustand for shared simulation state

**Decision**: Single Zustand store holds `{ origin, destination, params, results, playhead }`.

**Rationale**: Both the 3D map and the results dashboard need to react to the same state (selected stars, playhead position). Zustand's minimal API avoids prop-drilling through the R3F canvas boundary, which Context handles poorly.

### 7. Procedural galaxy for Zone 3

**Decision**: Milky Way rendered as a procedurally generated particle system (~500k points) synthesized from known structural parameters, not loaded from a dataset.

**Rationale**: No web-ready dataset covers the full Milky Way. Gaia's 1.7B star catalog is impractical for browser rendering. Procedural generation from published Milky Way parameters (4 spiral arms, logarithmic spiral equations, galactic bar dimensions) produces a visually accurate representation at negligible CPU cost (one-time generation at startup).

## Risks / Trade-offs

**[Risk] 500k particle galaxy + 50k star point cloud may cause frame drops on low-end hardware** → Mitigation: Zone 3 particles are a single `BufferGeometry` `<Points>` — GPU-bound, not CPU. Zone 2 uses instanced rendering. Add a quality toggle that halves particle counts if needed.

**[Risk] HYG CSV seeding adds cold-start latency on first launch** → Mitigation: Seed script runs at container build time, not at request time. SQLite file is pre-built and shipped with the backend.

**[Risk] Raycasting over 2k star meshes every frame is expensive** → Mitigation: Use pointer events on individual meshes, not global raycaster polling. Disable raycasting on Zone 2/3 layers entirely when their opacity < 0.3.

**[Risk] Physics precision: JavaScript doubles may drift for extreme values (Andromeda at 1g)** → Mitigation: Work in natural units (ly, yr) to keep numbers in a sane range. Document known precision limits (> 10M ly trips show approximate results).

**[Risk] Coasting-to-stop validation: user sets target coast speed S but `d_acc > D/2`** → Mitigation: Auto-cap v_max to the speed achievable at D/2 and surface a non-blocking validation message explaining the cap. Never silently produce wrong results.

## Migration Plan

Greenfield — no migration needed. Deployment steps:
1. Seed HYG data into SQLite (`python seed.py`)
2. Start FastAPI server (`uvicorn main:app`)
3. Start Vite dev server or build static frontend (`npm run build`)
4. Frontend served from Vite; API proxied from `/api` in dev

## Open Questions

- **Star label density in Zone 2**: Show all 119k names on hover (expensive raycasting) or only famous stars? Lean toward famous-only with a "click to reveal" for the dense cloud.
- **Playback speed**: Should "1× speed" mean 1 second real-time = 1 day ship time? 1 month? Should be configurable. Default TBD.
- **Solar system detail at max zoom-in**: When user zooms into Earth in Zone 1, show a schematic of the solar system (Earth orbit circle) to anchor scale? Nice-to-have, not blocking.
