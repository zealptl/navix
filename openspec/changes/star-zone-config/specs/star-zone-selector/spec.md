## ADDED Requirements

### Requirement: Zone selector renders as an overlay on the star map
The star map SHALL display a zone selector button group as an absolute-positioned overlay in the top-left corner of the 3D canvas container.

#### Scenario: Overlay is always visible
- **WHEN** the star map is mounted
- **THEN** the zone selector buttons are visible regardless of camera position or loading state

#### Scenario: Does not obscure Reset View
- **WHEN** both the zone selector and Reset View button are rendered
- **THEN** they occupy opposite corners (zone selector top-left, Reset View top-right) without overlap

### Requirement: Four named zone tiers
The zone selector SHALL offer exactly four tiers: **Famous**, **Naked Eye**, **Binocular**, **All Nearby**.

#### Scenario: Tier labels are displayed
- **WHEN** the zone selector renders
- **THEN** all four tier labels are visible as buttons

#### Scenario: Active tier is visually distinguished
- **WHEN** a tier is selected
- **THEN** that button has a distinct active style compared to inactive buttons

### Requirement: Default zone is Famous
Zone 1 stars SHALL default to Famous tier on initial load, fetching only stars with `is_famous = 1` (equivalent to the quick-select row).

#### Scenario: Initial star count matches famous set
- **WHEN** the app first loads
- **THEN** Zone 1 displays only the famous stars (~10–25 stars), not all stars within 200 ly

### Requirement: Selecting a tier fetches and merges stars
When the user selects a tier, the system SHALL fetch the corresponding star set and merge it (deduped by id) into the existing Zone 1 stars array.

#### Scenario: Expanding from Famous to Naked Eye
- **WHEN** user clicks Naked Eye (mag ≤ 6.5)
- **THEN** stars with magnitude ≤ 6.5 within 200 ly are loaded and added to the existing famous stars without duplicates or visual flash

#### Scenario: Expanding from Naked Eye to Binocular
- **WHEN** user clicks Binocular (mag ≤ 8)
- **THEN** additional stars with 6.5 < magnitude ≤ 8 are appended; previously visible stars remain in place

#### Scenario: Selecting All Nearby
- **WHEN** user clicks All Nearby
- **THEN** all stars within 200 ly (no magnitude filter) are loaded up to the backend default limit

#### Scenario: Clicking already-active tier does nothing
- **WHEN** user clicks the currently active tier button
- **THEN** no new fetch is triggered and no visual change occurs

### Requirement: Zone tier definitions
Tier fetch parameters SHALL be:

| Tier | API call |
|------|----------|
| Famous | `/api/stars/nearby?ly=200&limit=100` filtered to `is_famous=1` via dedicated `/api/stars/famous` endpoint |
| Naked Eye | `/api/stars/nearby?ly=200&max_mag=6.5` |
| Binocular | `/api/stars/nearby?ly=200&max_mag=8` |
| All Nearby | `/api/stars/nearby?ly=200` |

#### Scenario: Famous tier uses famous endpoint
- **WHEN** Famous tier is active
- **THEN** stars displayed are exactly the same set returned by `/api/stars/famous`

#### Scenario: Tier thresholds match astronomical definitions
- **WHEN** Naked Eye tier is selected
- **THEN** only stars with magnitude ≤ 6.5 are included (unaided human eye limit)
