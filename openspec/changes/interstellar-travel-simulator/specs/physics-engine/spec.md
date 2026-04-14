## ADDED Requirements

### Requirement: Rindler constant-acceleration equations
The physics engine SHALL implement the Rindler equations for constant proper acceleration. All calculations SHALL use natural units (distance in light-years, time in years, c = 1 ly/yr). The following relations SHALL hold for the acceleration phase:

- Coordinate velocity: `v(τ) = c · tanh(aτ/c)`
- Lorentz factor: `γ(τ) = cosh(aτ/c)`
- Coordinate distance: `x(τ) = (c²/a) · (cosh(aτ/c) − 1)`
- Coordinate time: `t(τ) = (c/a) · sinh(aτ/c)`
- Inverse (distance to proper time): `τ = (c/a) · acosh(ax/c² + 1)`
- Inverse (distance to coordinate time): `t = (c/a) · √((ax/c² + 1)² − 1)`

#### Scenario: 1g acceleration for 1 ship-year
- **WHEN** the engine computes acceleration at `a = 1.03 ly/yr²` (1g) for `τ = 1 year`
- **THEN** the resulting velocity `v` is approximately `0.77c` (within 1% tolerance)

#### Scenario: Coordinate time exceeds proper time at relativistic speeds
- **WHEN** the engine computes a trip at 1g where `τ = 3 years` of ship time
- **THEN** the coordinate time `t` is greater than `τ`, with `t/τ = γ` at the final instant

### Requirement: Coasting phase calculation
The physics engine SHALL calculate the coasting phase with constant velocity β = v/c as: ship proper time `τ_coast = d_coast · √(1−β²) / (βc)` and Earth coordinate time `t_coast = d_coast / (βc)`.

#### Scenario: Coasting adds less ship time than Earth time
- **WHEN** a coasting phase covers 6 light-years at β = 0.9c
- **THEN** `τ_coast` is less than `t_coast` by the factor `γ = 1/√(1−0.81) ≈ 2.29`

### Requirement: Trip profile — stop mode, no coasting
When `mode = stop` and `coastFraction = 0`, the engine SHALL compute a symmetric accelerate/decelerate profile: accelerate over `D/2`, decelerate over `D/2`. Total proper time = `2 · τ(D/2)`, total coordinate time = `2 · t(D/2)`.

#### Scenario: Earth-to-Tau-Ceti at 1g, stop, no coast
- **WHEN** the engine computes a trip from Earth to Tau Ceti (D = 11.91 ly) at 1g, stop mode, no coasting
- **THEN** ship time is approximately 6.2 years and Earth time is approximately 13.8 years (within 5% tolerance)

#### Scenario: Maximum velocity at midpoint
- **WHEN** stop mode with no coasting is computed
- **THEN** maximum velocity occurs exactly at the midpoint distance D/2 and equals `c · tanh(a · τ_half / c)`

### Requirement: Trip profile — stop mode, coast by distance fraction
When `mode = stop` and `coastFraction > 0`, the engine SHALL compute the cruise velocity by solving `d_acc = D · (1 − coastFraction) / 2`, then `γ = a · d_acc / c² + 1`, `β = √(1 − 1/γ²)`. The full profile SHALL be: accelerate over `d_acc`, coast over `D · coastFraction`, decelerate over `d_acc`.

#### Scenario: Coast fraction reduces ship travel time compared to no-coast at same acceleration
- **WHEN** two trips are computed at 1g to the same destination — one with 0% coast, one with 50% coast
- **THEN** the 50% coast trip has a longer ship time (lower average γ during the trip)

#### Scenario: Coast fraction 100% is invalid for stop mode
- **WHEN** `coastFraction = 1.0` and `mode = stop`
- **THEN** the engine returns a validation error (cannot decelerate with zero acceleration distance)

### Requirement: Trip profile — stop mode, coast by target speed
When `mode = stop` and the user specifies a target coast speed `S` (as fraction of c), the engine SHALL compute `d_acc = (c²/a) · (γ − 1)` where `γ = 1/√(1 − S²)`. If `d_acc > D/2`, the target speed is unachievable within the trip distance for a stop mission. In that case the engine SHALL auto-cap the speed to the maximum achievable at `D/2` and return a `cappedSpeed` field with a human-readable explanation.

#### Scenario: Auto-cap applied when target speed is unachievable
- **WHEN** the user requests a coast speed of 0.99c on a 5 ly trip at 0.1g
- **THEN** the engine returns `cappedSpeed` with the maximum achievable velocity at that distance, and a `validationMessage` explaining the cap

#### Scenario: Valid target speed produces correct profile
- **WHEN** target speed S is achievable (d_acc ≤ D/2)
- **THEN** the profile contains three phases with acceleration distance = deceleration distance = d_acc and coast distance = D − 2·d_acc

### Requirement: Trip profile — flyby mode
When `mode = flyby`, the engine SHALL compute an accelerate-only (or accelerate + coast) profile with no deceleration phase. The engine SHALL accept the same coasting parameters.

#### Scenario: Flyby trip is shorter in ship time than stop trip
- **WHEN** a flyby trip and a stop trip are computed with identical parameters except mode
- **THEN** the flyby ship time is less than the stop ship time

### Requirement: Animation keyframes generation
The physics engine SHALL generate an array of N keyframe objects (default N = 500) evenly spaced along ship proper time τ from 0 to τ_total. Each keyframe SHALL contain: `{ tau, t, x, v, gamma, phase }` where `phase` is one of `"accelerating"`, `"coasting"`, `"decelerating"`.

#### Scenario: Keyframes span full trip
- **WHEN** keyframes are generated for a complete trip
- **THEN** `keyframes[0].tau === 0`, `keyframes[N-1].tau === τ_total`, and every keyframe has a valid non-NaN `v` between 0 and 1

#### Scenario: Phase field reflects current trip segment
- **WHEN** keyframes are generated for a trip with a coasting phase
- **THEN** keyframes during the coast segment have `phase === "coasting"` and constant `v` and `gamma`

### Requirement: Input validation
The engine SHALL validate all inputs and return structured errors. Acceleration SHALL be between 0.001g and 100g. Distance SHALL be greater than 0. Coast fraction SHALL be between 0 and 1 (exclusive of 1 for stop mode).

#### Scenario: Zero acceleration rejected
- **WHEN** the engine is called with `acceleration = 0`
- **THEN** it returns an error with code `INVALID_ACCELERATION`

#### Scenario: Negative distance rejected
- **WHEN** the engine is called with a destination distance ≤ 0
- **THEN** it returns an error with code `INVALID_DISTANCE`
