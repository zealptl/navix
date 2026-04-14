## ADDED Requirements

### Requirement: Relativistic Tsiolkovsky mass ratio calculation
The mass ratio calculator SHALL implement the relativistic rocket equation: `m₀/m_f = exp(atanh(Δv/c) × c/v_e)` where `Δv` is the total mission delta-v and `v_e` is the engine exhaust velocity. For a stop mission, the total Δv SHALL be computed from the rapidity: `Δv_rapidity = 2 × atanh(β_max)` (in natural units). For a flyby, `Δv_rapidity = atanh(β_max)`.

#### Scenario: Photon rocket mass ratio for Earth-Tau Ceti 1g stop
- **WHEN** the trip is Earth to Tau Ceti at 1g, stop mode, no coasting
- **THEN** the photon rocket (v_e = c) mass ratio is approximately 26–27 (within 5% tolerance)

#### Scenario: Chemical rocket mass ratio is astronomically large
- **WHEN** any interstellar trip at β_max > 0.5c is computed
- **THEN** the chemical rocket mass ratio exceeds 10^20 and is displayed as a scientific notation value with a "Physically impossible" label

### Requirement: Propulsion type comparison table
The mass ratio display SHALL show a table comparing mass ratios across propulsion types: Chemical (v_e = 0.000013c), Ion thruster (v_e = 0.00021c), Nuclear pulse (v_e = 0.033c), Fusion (v_e = 0.1c), Antimatter (v_e = 0.5c), Photon rocket (v_e = c). Each row SHALL display: engine name, exhaust velocity, mass ratio, and a qualitative feasibility label.

#### Scenario: All engine rows rendered for any trip
- **WHEN** a valid trip profile is computed
- **THEN** the mass ratio table contains exactly 6 rows, one per propulsion type

#### Scenario: Feasibility labels applied correctly
- **WHEN** mass ratio is less than 100
- **THEN** feasibility label is "Feasible"

#### Scenario: Impossibly large ratios display correctly
- **WHEN** mass ratio exceeds 10^15
- **THEN** the value is displayed in scientific notation and the feasibility label is "Physically impossible"

### Requirement: Mass ratio updates with trip parameters
The mass ratio table SHALL recompute whenever any mission parameter changes, consistent with the live-results behavior of the mission control panel.

#### Scenario: Mass ratio updates on acceleration change
- **WHEN** user changes acceleration, altering β_max
- **THEN** all mass ratio values in the table update within one render cycle

#### Scenario: Flyby mode shows lower mass ratios than stop mode
- **WHEN** the same trip is computed in flyby vs stop mode
- **THEN** all mass ratios in flyby mode are lower (since Δv is halved)

### Requirement: Contextual callout for Project Hail Mary reference
The mass ratio display SHALL include a contextual note referencing the fictional Astrophage propulsion from *Project Hail Mary*. The note SHALL appear when the computed photon rocket mass ratio exceeds 10, to emphasize why exotic propulsion is necessary.

#### Scenario: Astrophage note shown for challenging trips
- **WHEN** the photon rocket mass ratio is greater than 10
- **THEN** a callout is displayed: "This is why Andy Weir invented Astrophage — even the theoretical best engine requires [X]× its own mass in fuel."

#### Scenario: Astrophage note hidden for trivial trips
- **WHEN** the photon rocket mass ratio is less than or equal to 10
- **THEN** no Astrophage callout is displayed
