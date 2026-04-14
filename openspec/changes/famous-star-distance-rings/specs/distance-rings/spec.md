## ADDED Requirements

### Requirement: Galactic-plane distance rings for famous stars
The `DistanceRings` component SHALL render one flat circular ring on the galactic plane (y = 0) for each famous star with `distance_ly <= 100`. Each ring SHALL be centered at world origin (Sun/Earth) with radius equal to the star's `distance_ly`. Rings with `distance_ly > 100` SHALL be omitted.

#### Scenario: Ring rendered for nearby famous star
- **WHEN** a famous star has `distance_ly <= 100`
- **THEN** a ring geometry is present in the scene at y = 0, centered at origin, with radius matching `distance_ly`

#### Scenario: Ring omitted for distant famous star
- **WHEN** a famous star has `distance_ly > 100` (e.g. Polaris at ~433 ly)
- **THEN** no ring geometry is rendered for that star

### Requirement: Drop-line from galactic plane to star position
For each rendered ring, the component SHALL draw a faint vertical line segment from the point `(star.x * PC_TO_LY, 0, star.z * PC_TO_LY)` up to the star's actual position `(star.x * PC_TO_LY, star.y * PC_TO_LY, star.z * PC_TO_LY)`. The drop-line SHALL be omitted if the star's galactic elevation is less than 0.1 ly.

#### Scenario: Drop-line rendered for elevated star
- **WHEN** a famous star's `|y * PC_TO_LY| >= 0.1`
- **THEN** a line segment is rendered from the star's galactic-plane projection to its 3D position

#### Scenario: Drop-line omitted for in-plane star
- **WHEN** a famous star's `|y * PC_TO_LY| < 0.1`
- **THEN** no drop-line is rendered for that star

### Requirement: Ring label with name and distance
Each ring SHALL display a text label anchored on the ring circumference showing the star's proper name and `distance_ly` rounded to one decimal place (e.g. `Sirius  8.6 ly`). The default label anchor SHALL be at the `+Z` axis intercept of the ring. When two rings have radii within 0.5 ly of each other, their label anchors SHALL be angularly offset by 45° increments to prevent label collision.

#### Scenario: Label shows name and distance
- **WHEN** a ring is visible for a famous star
- **THEN** its label text is `"<proper_name>  <distance_ly rounded to 1 decimal> ly"`

#### Scenario: Close-radius labels are staggered
- **WHEN** two famous stars have `|distance_ly_a - distance_ly_b| <= 0.5`
- **THEN** their label anchors are at different angular positions on their respective rings

### Requirement: Ring color matches spectral type
Each ring's stroke color SHALL use the same spectral-type color mapping as the star dot it represents (O/B → blue-white, A/F → warm white, G → yellow, K → orange, M → red-orange).

#### Scenario: Ring color matches star spectral type
- **WHEN** a ring is rendered for a star with spectral type "G"
- **THEN** the ring color is yellow (#FFE87C), matching the Zone 1 star dot color

### Requirement: Rings fade with Zone 1 LOD
The opacity of all rings and drop-lines SHALL follow the Zone 1 LOD curve: fully opaque when camera distance < 100 ly, fully transparent when camera distance > 300 ly, using `smoothstep(100, 300, cameraDistance)` as the fade factor. At maximum opacity, rings SHALL use opacity 0.35 and drop-lines SHALL use opacity 0.2.

#### Scenario: Rings invisible at Zone 2 camera distance
- **WHEN** the camera is 400 ly from origin
- **THEN** all rings and drop-lines have opacity 0 (invisible)

#### Scenario: Rings fully visible at Zone 1 camera distance
- **WHEN** the camera is 50 ly from origin
- **THEN** rings have opacity 0.35 and drop-lines have opacity 0.2

### Requirement: Show/hide toggle
The star map UI SHALL include a toggle button labeled `Rings` that shows and hides all distance rings and drop-lines. The toggle SHALL default to visible (on). Toggle state SHALL be local to the `StarMap3D` component and SHALL NOT persist across page reloads.

#### Scenario: Rings hidden when toggled off
- **WHEN** the user clicks the `Rings` toggle button and rings are currently visible
- **THEN** all rings, drop-lines, and ring labels disappear from the scene

#### Scenario: Rings shown when toggled on
- **WHEN** the user clicks the `Rings` toggle button and rings are currently hidden
- **THEN** all rings, drop-lines, and ring labels reappear in the scene
