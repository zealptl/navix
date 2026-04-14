## ADDED Requirements

### Requirement: Three-zone LOD rendering
The star map SHALL render three distinct layers based on camera distance from the scene origin (Earth), with smooth opacity crossfades between zones. Zone 1 covers the stellar neighborhood (individual named stars), Zone 2 covers the Orion Arm (dense point cloud), and Zone 3 covers the galactic scale (procedural Milky Way). All three layers SHALL be mounted simultaneously; opacity SHALL be driven by `smoothstep` of camera distance, with no hard cuts between zones.

#### Scenario: Zone 1 fully visible at close range
- **WHEN** camera distance from origin is less than 100 light-years
- **THEN** Zone 1 layer opacity is 1.0, Zone 2 opacity is 0.0, Zone 3 opacity is 0.0

#### Scenario: Crossfade between Zone 1 and Zone 2
- **WHEN** camera distance is between 100 ly and 300 ly
- **THEN** Zone 1 opacity decreases smoothly from 1.0 to 0.0 and Zone 2 opacity increases smoothly from 0.0 to 1.0, with both partially visible during the transition

#### Scenario: Zone 3 fully visible at galactic scale
- **WHEN** camera distance from origin is greater than 8,000 light-years
- **THEN** Zone 3 (procedural galaxy) opacity is 1.0, Zone 1 and Zone 2 opacities are 0.0

### Requirement: Zone 1 individual star rendering
Zone 1 SHALL render individual stars from the HYG database as instanced mesh sprites, colored by spectral type (O/B=blue-white, A/F=white-yellow, G=yellow, K=orange, M=red), sized by absolute magnitude. Stars SHALL be clickable to select as origin or destination.

#### Scenario: Spectral color applied
- **WHEN** Zone 1 renders a star with spectral type "G"
- **THEN** the star sprite color is yellow-white (approximately #FFE87C)

#### Scenario: Star selected as origin on click
- **WHEN** user clicks a star in Zone 1
- **THEN** the star is highlighted with a green pulsing ring and set as the mission origin in global state

#### Scenario: Star selected as destination on click
- **WHEN** user right-clicks (or uses secondary action) a star in Zone 1
- **THEN** the star is highlighted with an orange pulsing ring and set as the mission destination in global state

#### Scenario: Hover tooltip shown
- **WHEN** user hovers over a star in Zone 1
- **THEN** a floating label appears showing the star's name and distance from Earth in light-years

### Requirement: Zone 2 dense point cloud
Zone 2 SHALL render up to 50,000 stars from the HYG database as a single GPU `BufferGeometry` `Points` object. Raycasting for individual star selection SHALL be disabled in Zone 2 except for the curated famous stars list, which SHALL retain larger hit targets.

#### Scenario: Famous stars remain selectable in Zone 2
- **WHEN** camera is in the Zone 2 range and user clicks near a famous star (e.g., Vega)
- **THEN** that star is selected as origin or destination

#### Scenario: Non-famous stars not individually selectable in Zone 2
- **WHEN** camera is in Zone 2 range and user clicks on a non-famous star in the dense cloud
- **THEN** no selection occurs (click is a no-op)

### Requirement: Zone 3 procedural Milky Way
Zone 3 SHALL render a procedurally generated galaxy of approximately 500,000 particles distributed across a galactic bulge, four logarithmic spiral arms, a thin disk, and a sparse halo. Particle colors SHALL reflect stellar population age (arms: blue-white, bulge: yellow-orange, disk: dim reddish). Sagittarius A* SHALL be rendered as a distinct marker at the galactic center. The solar system's position in the Orion Arm SHALL be marked with a small "You are here" indicator.

#### Scenario: Galactic structure visible at scale
- **WHEN** camera distance is greater than 15,000 ly
- **THEN** four spiral arms are visually distinguishable and the galactic bar is visible at the center

#### Scenario: Solar system position marked
- **WHEN** Zone 3 is the active visible layer
- **THEN** a small labeled marker indicates the solar system's position approximately 26,000 ly from the galactic center in the Orion Arm

### Requirement: Orbit camera controls
The map SHALL support orbit controls allowing the user to rotate around the scene (click-drag), zoom in and out (scroll wheel), and pan (right-click drag or two-finger drag). Double-clicking a star in Zone 1 SHALL smoothly tween the camera to orbit that star. A "Reset View" button SHALL return the camera to the default position centered on Earth at Zone 1 scale.

#### Scenario: Camera orbits on drag
- **WHEN** user clicks and drags in the 3D viewport
- **THEN** the camera orbits around the current focus point

#### Scenario: Double-click zooms to star
- **WHEN** user double-clicks a named star in Zone 1
- **THEN** the camera smoothly animates to focus on that star with a Zone 1-appropriate distance

#### Scenario: Reset view returns to Earth
- **WHEN** user clicks the "Reset View" button
- **THEN** the camera animates back to its initial position centered on Earth at approximately 30 ly distance

### Requirement: Trajectory arc visualization
When both an origin and destination are selected, the map SHALL render a straight glowing line between the two stars. During playback, a ship icon SHALL travel along this line at a position corresponding to the current playhead's `x(τ)/D` fraction of total distance.

#### Scenario: Trajectory drawn on destination selection
- **WHEN** both origin and destination stars are selected
- **THEN** a glowing arc line is rendered between the two star positions in 3D space

#### Scenario: Ship icon tracks playhead
- **WHEN** the journey playback is active and the playhead is at proper time τ
- **THEN** the ship icon position on the trajectory line equals `origin + (destination - origin) × (x(τ) / D)` where D is total distance

### Requirement: Entry state — start at Earth, Zone 1
On initial load, the camera SHALL be positioned to show the Earth/Sun position and its stellar neighborhood at Zone 1 scale, with approximately 30–50 light-years visible. The Sun SHALL be the default selected origin.

#### Scenario: Initial camera position
- **WHEN** the application first loads
- **THEN** the camera is positioned approximately 30 ly from the scene origin, Zone 1 is the fully visible layer, and nearby named stars (Proxima Centauri, Alpha Centauri, Tau Ceti, etc.) are visible
