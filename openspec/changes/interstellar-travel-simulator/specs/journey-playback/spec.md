## ADDED Requirements

### Requirement: Playback scrubber on ship proper time axis
The playback system SHALL provide a scrubber representing ship proper time τ from 0 to τ_total. Dragging the scrubber SHALL seek to that point in the journey, updating all downstream visualizations synchronously. The scrubber SHALL display the current τ value as a formatted label (e.g., "3.2 years ship time").

#### Scenario: Scrubber seek updates ship position
- **WHEN** user drags the scrubber to τ = τ_total / 2
- **THEN** the ship icon on the 3D map moves to the midpoint of the trajectory arc

#### Scenario: Scrubber displays current proper time
- **WHEN** scrubber is at any position
- **THEN** the label shows the correct τ value in years, formatted to 2 decimal places

### Requirement: Play/pause animated playback
The playback system SHALL support Play and Pause controls. When playing, the scrubber SHALL advance at a configurable rate (default: 1 real second = 1 ship-month). Playback SHALL stop automatically at τ_total.

#### Scenario: Play advances scrubber
- **WHEN** user clicks Play and waits 2 real seconds at default speed
- **THEN** the scrubber has advanced by approximately 2/12 years (≈ 0.167 years) of ship time

#### Scenario: Playback auto-stops at journey end
- **WHEN** playback reaches τ_total
- **THEN** playback pauses automatically and the scrubber rests at the final position

#### Scenario: Pause halts scrubber
- **WHEN** user clicks Pause during playback
- **THEN** the scrubber stops advancing and the current position is preserved

### Requirement: Dual clock display
The playback panel SHALL display two clocks side by side: **Ship Clock** (ship proper time τ) and **Earth Clock** (coordinate time t). Both clocks SHALL update continuously during playback to reflect the values at the current scrubber position. The clocks SHALL be visually distinct — the Earth clock SHALL appear to run faster than the ship clock at relativistic speeds.

#### Scenario: Earth clock advances faster than ship clock at high velocity
- **WHEN** the trip is at a coasting phase with β = 0.9c (γ ≈ 2.29)
- **THEN** for each unit of ship time elapsed during playback, the Earth clock advances by approximately 2.29 units

#### Scenario: Both clocks at zero on journey start
- **WHEN** scrubber is at position 0 (τ = 0)
- **THEN** both ship clock and Earth clock display 0.00 years

#### Scenario: Clocks show final values at journey end
- **WHEN** scrubber is at τ_total
- **THEN** ship clock shows τ_total and Earth clock shows t_total (always ≥ τ_total)

### Requirement: Live velocity profile chart
A velocity chart SHALL display β (v/c) on the Y axis (0 to 1) and ship proper time τ on the X axis. The chart SHALL render the full pre-computed velocity profile as a static curve. A vertical playhead line SHALL track the current scrubber position in real-time.

#### Scenario: Velocity curve shape reflects trip phases
- **WHEN** a stop-mode trip with no coasting is displayed
- **THEN** the velocity curve rises during the first half and falls symmetrically during the second half, peaking at τ_half

#### Scenario: Playhead tracks scrubber
- **WHEN** user scrubs to any position τ
- **THEN** the vertical playhead line on the velocity chart is at the corresponding X position

### Requirement: Time divergence chart
A time-divergence chart SHALL display both ship time (τ, diagonal reference line at 45°) and Earth time (t, a curve above it) on the same axes, with τ on the X axis. The area between the two lines SHALL be shaded to emphasize the divergence.

#### Scenario: Earth time curve above ship time line
- **WHEN** any relativistic trip is computed (v_max > 0.1c)
- **THEN** the Earth time curve is always at or above the ship time reference line

#### Scenario: Curves are identical for non-relativistic trips
- **WHEN** acceleration is very low and max velocity is below 0.01c
- **THEN** ship time and Earth time curves are visually indistinguishable

### Requirement: Phase breakdown bar
A horizontal phase bar SHALL display the trip as colored segments: acceleration (green), coasting (blue), deceleration (red, stop mode only). Each segment SHALL be labeled with its duration in ship time and its distance. The phase bar SHALL be proportional to ship proper time (not distance).

#### Scenario: Three segments shown for stop mode with coasting
- **WHEN** mode is stop and coastFraction > 0
- **THEN** the phase bar shows three colored segments: accelerate / coast / decelerate

#### Scenario: Two segments shown for stop mode with no coasting
- **WHEN** mode is stop and coastFraction = 0
- **THEN** the phase bar shows two segments: accelerate and decelerate (equal width)

#### Scenario: Segment widths proportional to proper time duration
- **WHEN** the coasting phase has a longer ship time than the acceleration phase
- **THEN** the coast segment is visually wider than the accelerate segment in the bar
