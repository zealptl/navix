## ADDED Requirements

### Requirement: Sol → Proxima Centauri reference scenario
The test suite SHALL include a test case for the Sol → Proxima Centauri trip (D = 4.244 ly) at 1g, stop mode, no coasting, with expected values derived from closed-form Rindler equations. The test SHALL verify ship time and Earth time within 5% tolerance. The test SHALL serve as a regression guard for the parsec/light-year unit conversion bug.

#### Scenario: Ship time approximately 3.55 years
- **WHEN** `tripProfile` is called with distance = 4.244 ly, acceleration = 1g, mode = stop, coastMode = none
- **THEN** `totalTau` is approximately 3.55 years (within 5%)

#### Scenario: Earth time approximately 5.87 years
- **WHEN** `tripProfile` is called with distance = 4.244 ly, acceleration = 1g, mode = stop, coastMode = none
- **THEN** `totalT` is approximately 5.87 years (within 5%)

#### Scenario: Earth time exceeds the trip distance in light-years
- **WHEN** `tripProfile` is called with distance = 4.244 ly, acceleration = 1g, mode = stop, coastMode = none
- **THEN** `totalT` is strictly greater than 4.244 (because the ship always travels slower than c)

#### Scenario: Peak velocity approximately 0.95c
- **WHEN** `tripProfile` is called with distance = 4.244 ly, acceleration = 1g, mode = stop, coastMode = none
- **THEN** `maxVelocity` is approximately 0.95 (within 5%)

### Requirement: Physics invariants hold for all valid trip profiles
The test suite SHALL verify physical invariants that must hold for every valid trip regardless of distance, acceleration, or coasting mode. These invariants catch entire classes of unit-conversion and sign bugs.

#### Scenario: Earth time always exceeds ship time (time dilation)
- **WHEN** any valid `tripProfile` result is computed
- **THEN** `totalT` is strictly greater than `totalTau`

#### Scenario: Earth time always exceeds trip distance (subluminal travel)
- **WHEN** any valid `tripProfile` result is computed with distance D
- **THEN** `totalT` is strictly greater than D (since the ship never reaches c)

#### Scenario: Phase distances sum to total distance
- **WHEN** any valid `tripProfile` result is computed with distance D
- **THEN** the sum of `phase.distance` across all phases equals D within 1e-9 tolerance

#### Scenario: Phase ship times sum to totalTau
- **WHEN** any valid `tripProfile` result is computed
- **THEN** the sum of `phase.tauDuration` across all phases equals `totalTau` within 1e-9 tolerance

#### Scenario: Phase Earth times sum to totalT
- **WHEN** any valid `tripProfile` result is computed
- **THEN** the sum of `phase.tDuration` across all phases equals `totalT` within 1e-9 tolerance

#### Scenario: All velocity values are in [0, 1)
- **WHEN** any valid `tripProfile` result is computed
- **THEN** all `velocityStart` and `velocityEnd` values across all phases are in the range [0, 1)

### Requirement: Keyframe position conservation
The test suite SHALL verify that the final keyframe's coordinate position `x` matches the total trip distance to within 1% tolerance.

#### Scenario: Last keyframe x equals total distance
- **WHEN** `generateKeyframes` is called on a valid stop-mode trip profile
- **THEN** `frames[N-1].x` is approximately equal to `profile.totalDistance` within 1%

#### Scenario: Keyframes are monotonically increasing in tau
- **WHEN** `generateKeyframes` is called on any valid trip profile with N frames
- **THEN** each frame's `tau` is greater than or equal to the previous frame's `tau`

#### Scenario: Keyframe x is monotonically non-decreasing for stop and flyby modes
- **WHEN** `generateKeyframes` is called on a stop-mode or flyby-mode trip
- **THEN** each frame's `x` is greater than or equal to the previous frame's `x`

### Requirement: Flyby mode invariants
The test suite SHALL verify flyby-mode specific constraints.

#### Scenario: Flyby total distance equals input distance
- **WHEN** `tripProfile` is called with mode = flyby and distance D
- **THEN** `totalDistance` equals D within 1e-9

#### Scenario: Flyby Earth time is less than stop Earth time for same parameters
- **WHEN** both flyby and stop trips are computed with identical distance and acceleration
- **THEN** flyby `totalT` is less than stop `totalT`

### Requirement: Target speed coasting produces correct cruise velocity
The test suite SHALL verify that when a reachable target speed is requested, the coasting phase velocity exactly matches the requested speed.

#### Scenario: Coast phase velocity matches requested target speed
- **WHEN** `tripProfile` is called with mode = stop, coastMode = targetSpeed, and an achievable targetSpeed S
- **THEN** the coasting phase's `velocityStart` and `velocityEnd` both equal S within 1e-6
