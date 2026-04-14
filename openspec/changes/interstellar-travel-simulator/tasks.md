## 1. Project Scaffolding

- [x] 1.1 Initialize Vite + React + TypeScript frontend project
- [x] 1.2 Install frontend dependencies: react-three-fiber, @react-three/drei, @react-three/postprocessing, recharts, zustand
- [x] 1.3 Initialize FastAPI backend project with SQLite dependency (sqlite3, sqlalchemy)
- [x] 1.4 Configure Vite dev proxy to forward `/api/*` requests to FastAPI backend
- [x] 1.5 Set up Tailwind CSS with dark space-themed base styles

## 2. Star Database & Backend

- [x] 2.1 Download HYG stellar catalog CSV (hygdata_v3.csv)
- [x] 2.2 Define SQLite schema: stars table with x/y/z, precomputed distance_ly, is_famous, famous_rank, blurb
- [x] 2.3 Write Python seed script to parse HYG CSV, compute distance_ly/distance_pc, and populate database
- [x] 2.4 Curate famous stars list (16+ entries): set is_famous=true, famous_rank, and blurb for each
- [x] 2.5 Create SQLite FTS5 virtual table over proper_name and bayer_name
- [x] 2.6 Implement FastAPI endpoint: GET /api/stars/famous
- [x] 2.7 Implement FastAPI endpoint: GET /api/stars/search?q=
- [x] 2.8 Implement FastAPI endpoint: GET /api/stars/:id
- [x] 2.9 Implement FastAPI endpoint: GET /api/stars/nearby?ly=

## 3. Physics Engine (TypeScript)

- [x] 3.1 Create physics.ts with Rindler equation primitives: rindlerVelocity, rindlerGamma, rindlerDistance, rindlerCoordTime and their inverses
- [x] 3.2 Implement tripProfile() for stop mode, no coasting
- [x] 3.3 Implement tripProfile() for stop mode, coast by distance fraction
- [x] 3.4 Implement tripProfile() for stop mode, coast by target speed — including auto-cap logic and validation message
- [x] 3.5 Implement tripProfile() for flyby mode
- [x] 3.6 Implement generateKeyframes(profile, N=500) returning { tau, t, x, v, gamma, phase }[] 
- [x] 3.7 Add input validation with structured error codes (INVALID_ACCELERATION, INVALID_DISTANCE, etc.)
- [x] 3.8 Write unit tests for key physics outputs: 1g to Tau Ceti (ship ~6.2yr, Earth ~13.8yr), auto-cap scenario, coasting phase time dilation

## 4. Global State (Zustand)

- [x] 4.1 Define Zustand store shape: { origin, destination, params, results, keyframes, playhead, isPlaying }
- [x] 4.2 Wire params changes to auto-invoke tripProfile() and generateKeyframes(), storing results in store
- [x] 4.3 Add playhead actions: seek(tau), play(), pause(), advanceTick(deltaMs)

## 5. 3D Star Map — Zone 1 (Stellar Neighborhood)

- [x] 5.1 Create StarMap3D React component with R3F Canvas, OrbitControls, and ambient/point lighting
- [x] 5.2 Fetch nearby stars (< 200 ly) from /api/stars/nearby on mount; cache in component state
- [x] 5.3 Render Zone 1 stars as instanced sprites colored by spectral type and sized by magnitude
- [x] 5.4 Add pointer events on Zone 1 stars: hover shows Html tooltip (name + distance), click sets origin, right-click sets destination
- [x] 5.5 Render origin star with green pulsing ring, destination star with orange pulsing ring

## 6. 3D Star Map — Zone 2 (Orion Arm)

- [x] 6.1 Fetch full HYG dataset (< 5,000 ly) from backend; convert to BufferGeometry Float32Array positions
- [x] 6.2 Render Zone 2 as a single Points object with vertex colors from spectral type
- [x] 6.3 Disable raycasting on Zone 2 Points; retain click targets only for famous stars (larger invisible mesh overlays)

## 7. 3D Star Map — Zone 3 (Procedural Galaxy)

- [x] 7.1 Implement generateGalaxy() function: ~500k particles across bulge, 4 logarithmic spiral arms, thin disk, halo
- [x] 7.2 Color particles by region (arms: blue-white, bulge: yellow-orange, disk: dim reddish)
- [x] 7.3 Render galaxy as BufferGeometry Points, generated once at component mount
- [x] 7.4 Add Sagittarius A* marker at galactic center (0, 0, 0 in galactic coords)
- [x] 7.5 Add "You are here" marker at solar system position (~26,000 ly from center in Orion Arm)

## 8. 3D Star Map — LOD Transitions & Camera

- [x] 8.1 Implement useFrame hook that reads camera.position.length() and updates Zone 1/2/3 material opacities via smoothstep
- [x] 8.2 Define zone boundaries: Zone 1 [0–100 ly full, fades 100–300 ly], Zone 2 [200–5k ly full, fades at edges], Zone 3 [>8k ly full, fades 4k–8k ly]
- [x] 8.3 Add double-click handler on Zone 1 stars to smoothly tween camera to orbit that star
- [x] 8.4 Add "Reset View" button that tweens camera back to Earth at ~30 ly distance
- [x] 8.5 Set OrbitControls minDistance = 0.01 ly, maxDistance = 150,000 ly

## 9. Trajectory Visualization

- [x] 9.1 Render a glowing Line between origin and destination when both are selected
- [x] 9.2 Add ship icon mesh that reads keyframes[playheadIndex].x from store and positions itself on the trajectory line
- [x] 9.3 Show midpoint label on trajectory: "Distance: X ly"

## 10. Mission Control Panel

- [x] 10.1 Build MissionControlPanel component with origin/destination displays and "swap" button
- [x] 10.2 Render famous star quick-select buttons (fetched from /api/stars/famous) in a scrollable row
- [x] 10.3 Build star search input with 300ms debounce, calling /api/stars/search, showing results dropdown
- [x] 10.4 Build acceleration input with 0.001–100g range, preset buttons (0.1g, 0.5g, 1g, 2g), default 1g
- [x] 10.5 Build coasting mode toggle (Percentage / Target Speed) with conditional input rendering
- [x] 10.6 Build coast percentage slider (0–99%) for percentage mode
- [x] 10.7 Build target speed input (0–0.9999c) for target speed mode, displaying auto-cap validation message when returned
- [x] 10.8 Build stop/flyby toggle
- [x] 10.9 Wire all inputs to Zustand store params; results update reactively with no submit button

## 11. Journey Playback UI

- [x] 11.1 Build PlaybackPanel component with Play/Pause button, Reset button, and scrubber (input[type=range] over τ axis)
- [x] 11.2 Display scrubber label showing current τ in years (2 decimal places)
- [x] 11.3 Build DualClock component: Ship Clock (τ) and Earth Clock (t), both reading from store playhead
- [x] 11.4 Implement play ticker: useInterval that calls advanceTick() at ~60fps, advancing τ by (deltaMs / 1000) × (1/12) years per second (1 real second = 1 ship month default)
- [x] 11.5 Auto-pause playback when playhead reaches τ_total

## 12. Charts & Visualizations

- [x] 12.1 Build VelocityChart (Recharts LineChart): β on Y axis, τ on X axis, full pre-computed curve + vertical playhead line
- [x] 12.2 Build TimeDivergenceChart: both τ (reference line) and t (curve) on same axes, shaded area between them
- [x] 12.3 Build PhaseBar: horizontal segmented bar with colored sections (accelerate/coast/decelerate), labeled with duration and distance
- [x] 12.4 Build summary stat cards: Ship Time, Earth Time, Max Velocity (as % of c), Lorentz Factor γ

## 13. Mass Ratio Display

- [x] 13.1 Implement massRatio(deltaV_rapidity, exhaustVelocity) function in physics.ts
- [x] 13.2 Define propulsion types table: Chemical, Ion, Nuclear Pulse, Fusion, Antimatter, Photon Rocket with exhaust velocities
- [x] 13.3 Build MassRatioTable component: 6 rows, each with engine name, v_e, computed mass ratio, feasibility label
- [x] 13.4 Format mass ratios: < 10,000 show as integer; > 10,000 show as scientific notation; > 10^15 show "Physically impossible"
- [x] 13.5 Add Astrophage contextual callout: show when photon rocket mass ratio > 10

## 14. Polish & Integration

- [x] 14.1 Add bloom/glow post-processing to stars and trajectory line via @react-three/postprocessing
- [x] 14.2 Ensure all charts and UI panels are responsive within a dark-themed layout (sidebar + main 3D viewport)
- [x] 14.3 Add loading states for star data fetches (skeleton states, not spinners)
- [x] 14.4 Add error boundary around R3F canvas with fallback message
- [x] 14.5 Test full trip scenario: Earth → Tau Ceti, 1g, stop, no coast — verify ship time ≈ 6.2yr, Earth time ≈ 13.8yr, mass ratio ≈ 27 for photon rocket
- [x] 14.6 Test auto-cap scenario: trip too short to reach target speed — verify validation message appears and results are correct for capped speed
