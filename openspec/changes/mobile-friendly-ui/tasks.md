## 1. Foundation: Enable Scrolling & Viewport Meta

- [x] 1.1 Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">` to `frontend/index.html` if not already present
- [x] 1.2 In `frontend/src/index.css`, change `overflow: hidden` on `html, body, #root` to `overflow-x: hidden` and add `overflow-y: auto` so mobile users can scroll vertically

## 2. App Layout Responsive Fixes

- [x] 2.1 In `frontend/src/App.tsx`, ensure the main sidebar+viewport row uses `flex-col xl:flex-row` (already present — verify breakpoint is correct and gap is mobile-friendly)
- [x] 2.2 In `frontend/src/App.tsx`, set the StarMap3D container min-height to `300px` on mobile and `400px` on `md:` and above using responsive Tailwind classes
- [x] 2.3 In `frontend/src/App.tsx`, verify chart/playback bottom section uses `flex-col lg:flex-row` and gaps are mobile-appropriate

## 3. MissionControlPanel Mobile Fixes

- [x] 3.1 In `frontend/src/components/MissionControlPanel.tsx`, remove `max-w-sm` from the panel root `div` so it fills its container on mobile
- [x] 3.2 Change the coasting mode toggle container from `w-fit` to `w-full` and add `flex-1` to each toggle button so they span full width on mobile (add `sm:w-fit sm:flex-none` to revert on larger screens)
- [x] 3.3 Change the mission mode (stop/flyby) toggle container from `w-fit` to `w-full` with the same `flex-1` per button pattern

## 4. Touch Target Sizes

- [x] 4.1 In `frontend/src/PlaybackPanel.tsx`, ensure Play/Pause and Reset buttons have `min-h-[44px]` (currently `py-2` — verify this meets 44px, adjust if not)
- [x] 4.2 In `frontend/src/components/MissionControlPanel.tsx`, verify all `StarSelectInput` display buttons and inputs are at least 44px tall (currently `min-h-[40px]` — bump to `min-h-[44px]`)
- [x] 4.3 Verify acceleration preset buttons and coast mode buttons have sufficient tap area (add padding if below 44px)

## 5. Chart Container Responsive Heights

- [x] 5.1 In `frontend/src/Charts.tsx`, make `VelocityChart` container height responsive: use a smaller fixed height on mobile (e.g. `h-40`) and taller on `md:` (e.g. `md:h-48`)
- [x] 5.2 In `frontend/src/Charts.tsx`, apply the same responsive height pattern to `TimeDivergenceChart`
- [x] 5.3 In `frontend/src/Charts.tsx`, update the `ResponsiveContainer height` prop values to match the adjusted container heights

## 6. 3D Canvas Touch Scroll Fix

- [x] 6.1 In `frontend/src/components/StarMap3D.tsx`, add `style={{ touchAction: 'none' }}` to the canvas wrapper `div` so touch drag on the 3D view controls the camera rather than scrolling the page
