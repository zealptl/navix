## ADDED Requirements

### Requirement: Root element allows vertical scrolling on mobile
The app root (`html`, `body`, `#root`) SHALL allow vertical scrolling so that users on mobile viewports can reach all content. Horizontal overflow SHALL be hidden to prevent bleed.

#### Scenario: User scrolls vertically on a 375px-wide screen
- **WHEN** the page is loaded on a viewport 375px wide
- **THEN** the user can scroll vertically to see all page content without horizontal scroll

### Requirement: MissionControlPanel is full-width on mobile
The MissionControlPanel SHALL stretch to fill the full container width on viewports narrower than `xl` (1280px). The `max-w-sm` constraint SHALL only apply at `xl` and above.

#### Scenario: Panel renders on a 375px screen
- **WHEN** the MissionControlPanel is rendered on a 375px viewport
- **THEN** the panel width equals the viewport width minus padding, with no empty side margins

### Requirement: Toggle button groups are full-width on mobile
The coasting mode and mission mode toggle groups SHALL use full container width on mobile viewports, with each button taking equal flex space. On `sm` and above they MAY revert to `w-fit`.

#### Scenario: Coasting mode toggle on mobile
- **WHEN** the CoastControls component renders on a 375px viewport
- **THEN** the toggle button group spans the full available width and each button is at least 44px tall

### Requirement: Touch targets meet minimum size
All interactive elements (buttons, inputs, range sliders) SHALL have a minimum touch target height of 44px on mobile viewports.

#### Scenario: Play/Pause button tappable on mobile
- **WHEN** the PlaybackPanel renders on a 375px viewport
- **THEN** the Play/Pause and Reset buttons are at least 44px tall

### Requirement: 3D viewport maintains usable height on mobile
The StarMap3D canvas container SHALL have a minimum height of 300px on mobile viewports so the 3D view is visible without requiring excessive scrolling.

#### Scenario: StarMap renders on mobile
- **WHEN** the app loads on a 375px wide viewport
- **THEN** the 3D star map canvas is at least 300px tall and fully visible in its container

### Requirement: App layout stacks vertically on mobile
The main app layout SHALL use a single-column vertical stack on viewports narrower than `xl`. The sidebar and 3D viewport SHALL appear one above the other, not side by side.

#### Scenario: Single-column layout on 375px screen
- **WHEN** the app renders on a 375px wide viewport
- **THEN** MissionControlPanel appears above StarMap3D in a vertical stack with no horizontal clipping

### Requirement: Viewport meta tag is present
The `index.html` SHALL include a `<meta name="viewport" content="width=device-width, initial-scale=1.0">` tag so mobile browsers scale the page correctly.

#### Scenario: Page loads on mobile browser
- **WHEN** a mobile browser loads the app
- **THEN** the viewport width matches the device width and no initial zoom is applied
