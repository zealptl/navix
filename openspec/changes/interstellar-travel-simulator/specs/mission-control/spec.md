## ADDED Requirements

### Requirement: Star selection via quick-buttons and search
The mission control panel SHALL display quick-select buttons for all famous stars, allowing one-click selection of origin or destination. A search input SHALL provide full-text search against the star database, displaying up to 10 results in a dropdown. Selecting a star from either source SHALL update the 3D map (camera does not move on search select, only on double-click in map).

#### Scenario: Famous star button sets destination
- **WHEN** user clicks the "Tau Ceti" quick-select button while origin is Earth
- **THEN** Tau Ceti is set as the mission destination and highlighted on the 3D map

#### Scenario: Search dropdown populated from API
- **WHEN** user types "vega" in the destination search input
- **THEN** a dropdown appears within 300ms containing Vega as a result

#### Scenario: Search result selection sets destination
- **WHEN** user selects a star from the search dropdown
- **THEN** that star is set as the destination and the dropdown closes

### Requirement: Acceleration input
The panel SHALL provide an acceleration input in units of g (Earth gravity, 9.81 m/s²). The input SHALL accept values between 0.001g and 100g. A set of preset buttons (0.1g, 0.5g, 1g, 2g) SHALL allow fast selection.

#### Scenario: Default acceleration is 1g
- **WHEN** the application loads
- **THEN** the acceleration field is pre-populated with 1.0 g

#### Scenario: Preset button sets value
- **WHEN** user clicks the "1g" preset button
- **THEN** the acceleration input value becomes 1.0 and results recompute

#### Scenario: Out-of-range input shows validation error
- **WHEN** user enters 0 in the acceleration field
- **THEN** an inline error message is shown and calculation does not run

### Requirement: Coasting mode selection
The panel SHALL provide two coasting modes: **Percentage** (coast X% of total distance) and **Target Speed** (coast after reaching speed S). The user SHALL select between modes via a toggle. The active mode SHALL reveal the relevant input (a 0–99% slider for percentage mode, or a 0–0.9999c speed input for target speed mode).

#### Scenario: Coast percentage slider updates results live
- **WHEN** user drags the coast percentage slider
- **THEN** trip profile results update in real-time without requiring a submit action

#### Scenario: Target speed input shows validation message on auto-cap
- **WHEN** the physics engine returns a `cappedSpeed` for the entered target speed
- **THEN** the panel displays: "Target speed capped to [X]c — not enough distance to reach [Y]c and stop"

### Requirement: Stop vs flyby toggle
The panel SHALL provide a binary toggle for mission mode: **Stop** (decelerate to rest at destination) or **Flyby** (no deceleration). When Stop is selected, the deceleration phase SHALL be shown in the phase breakdown. When Flyby is selected, the deceleration section SHALL not appear.

#### Scenario: Stop mode shows deceleration in results
- **WHEN** mode is set to Stop
- **THEN** the phase breakdown displays three sections: Accelerate / Coast / Decelerate

#### Scenario: Flyby mode hides deceleration
- **WHEN** mode is set to Flyby
- **THEN** the phase breakdown displays only Accelerate and Coast sections

### Requirement: Results update reactively
All trip profile results SHALL recompute and update in the UI whenever any parameter changes (acceleration, coasting mode, coasting value, stop/flyby toggle, origin, or destination). There SHALL be no explicit "Calculate" button — results are always live.

#### Scenario: Results recompute on acceleration change
- **WHEN** user changes the acceleration value from 1g to 0.5g
- **THEN** all displayed results (ship time, Earth time, max velocity, Lorentz factor) update within one render cycle

#### Scenario: No stale results shown
- **WHEN** the origin or destination changes
- **THEN** results update immediately to reflect the new distance
