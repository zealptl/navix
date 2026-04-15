## Why

The Navix Interstellar Travel Simulator is currently designed for desktop viewports, with fixed widths, overflow-hidden root elements, and multi-column layouts that break on mobile screens. Users on phones or tablets see misaligned content, cut-off panels, and an unusable interface.

## What Changes

- Remove `overflow: hidden` from the root `html/body/#root` CSS so mobile users can scroll the full page
- Make the `MissionControlPanel` stretch full-width on mobile (remove `max-w-sm` constraint when not on desktop)
- Convert the coasting mode toggle buttons from `w-fit` fixed-width to full-width responsive layout on mobile
- Make chart containers adapt height for smaller screens
- Ensure the 3D StarMap viewport has a sensible minimum height on mobile (not cut off)
- Add a proper `<meta name="viewport">` tag if missing for correct mobile scaling
- Ensure the `App.tsx` layout stacks vertically on mobile and only goes multi-column on larger screens (already partially done with `xl:flex-row` but needs tuning)
- Touch target sizes meet 44px minimum for interactive controls (buttons, inputs)

## Capabilities

### New Capabilities

- `mobile-layout`: Responsive layout system ensuring the full app renders correctly on mobile viewports (320px–768px wide), including scrollable root, full-width panels, appropriately-sized touch targets, and stacked column layouts

### Modified Capabilities

- None

## Impact

- `frontend/src/index.css`: Remove `overflow: hidden` from root; add mobile-safe scroll behavior
- `frontend/src/App.tsx`: Adjust breakpoints and layout gaps for mobile
- `frontend/src/components/MissionControlPanel.tsx`: Remove `max-w-sm`, make toggle groups full-width on mobile
- `frontend/index.html`: Verify viewport meta tag is present
- `frontend/src/Charts.tsx`: Adjust chart heights for small screens
- `frontend/src/PlaybackPanel.tsx`: Ensure touch targets are large enough
