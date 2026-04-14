## Why

Interstellar travel is one of the most physics-rich thought experiments available — but existing tools are either dry calculators or pure fiction. Inspired by *Project Hail Mary* (Andy Weir), this app gives users a visceral, scientifically accurate simulation of what it would actually take to cross the stars: how long it takes on the ship vs. Earth, what happens to time at near-light speed, and why fuel mass ratios make it nearly impossible without exotic propulsion.

## What Changes

- New web application — no existing codebase
- Introduce a 3D interactive star map (three zoom zones: neighborhood, Orion Arm, galactic) backed by real HYG stellar catalog data
- Introduce a relativistic physics engine computing proper time, coordinate time, velocity profile, and Lorentz factor for constant-acceleration trips with optional coasting phases
- Introduce a mission control panel where users configure acceleration, coasting mode, stop vs. flyby, and propulsion type
- Introduce animated playback: scrubbing through ship proper time shows the ship moving in 3D, dual clocks diverging, and the velocity/time-dilation curves animating live
- Introduce a mass ratio calculator showing the fuel-to-payload ratio required for each trip under different propulsion types

## Capabilities

### New Capabilities

- `star-map-3d`: Interactive three-zone 3D star map with LOD transitions, real star positions from HYG database, orbit controls (zoom/rotate/pan), and selectable origin/destination stars
- `star-database`: SQLite-backed star catalog seeded from HYG data with precomputed distances and travel times; REST API for famous stars quick-select and full-text search
- `physics-engine`: Relativistic trip profile calculator implementing Rindler equations for constant proper acceleration, coasting phases, stop vs. flyby modes, and auto-cap validation when target speed exceeds achievable maximum
- `mission-control`: User-facing parameter panel for configuring trips — acceleration, coasting mode (% of distance or target speed), stop/flyby toggle, propulsion type selector
- `journey-playback`: Animated playback system scrubbing through proper time τ, driving ship position on 3D map, dual ship/Earth clock display, and live-animated velocity and time-dilation charts
- `mass-ratio-display`: Relativistic Tsiolkovsky equation calculator showing fuel-to-payload mass ratio for the configured trip across a set of propulsion types (chemical, fusion, antimatter, photon rocket)

### Modified Capabilities

## Impact

- New dependencies: React, TypeScript, Vite, React Three Fiber, @react-three/drei, @react-three/postprocessing, Recharts, Zustand, FastAPI, SQLite, Python
- HYG stellar catalog data (CSV, ~119k stars) must be seeded into SQLite at build time
- Physics engine runs entirely client-side — no API latency on parameter changes
- FastAPI backend serves only star data (search, famous list, single star lookup)
- No existing code affected — greenfield project
