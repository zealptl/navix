## Context

The Navix app is a React + Tailwind CSS single-page application. The current layout assumes a large viewport: `html/body/#root` use `overflow: hidden`, the MissionControlPanel has a `max-w-sm` cap, and the coasting mode toggle uses `w-fit`. On mobile, this results in cropped content and no scrolling. The app uses Tailwind CSS v4 (imported via `@import "tailwindcss"`) with responsive prefix utilities (`xl:`, `lg:`).

## Goals / Non-Goals

**Goals:**
- Full usability on mobile screens (320px–768px wide) with vertical scrolling
- Correct touch target sizes (min 44px height) for all interactive elements
- No horizontal overflow or clipped content on small viewports
- Responsive layouts that stack vertically on mobile and expand on larger screens

**Non-Goals:**
- Redesigning the visual style or color scheme
- Adding a mobile navigation drawer or tab bar
- Optimizing the 3D StarMap for touch gestures (out of scope)
- Dark/light mode switching

## Decisions

### 1. Enable scrolling via CSS root fix
**Decision**: Change `overflow: hidden` on `html, body, #root` to `overflow-x: hidden` (block horizontal overflow) and allow vertical scroll.
**Rationale**: The current `overflow: hidden` is what prevents mobile scrolling entirely. Simply relaxing it enables the natural document flow without requiring any JS or layout restructure. Keeping `overflow-x: hidden` prevents horizontal scroll bleed.

### 2. Use Tailwind responsive prefixes throughout — no custom breakpoints
**Decision**: Use only existing Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`) for all responsive changes.
**Rationale**: The project already uses Tailwind v4 with `xl:flex-row` in App.tsx. Staying consistent with the existing pattern avoids adding custom CSS or new breakpoint definitions.

### 3. Remove `max-w-sm` from MissionControlPanel
**Decision**: Remove the `max-w-sm` width cap so the panel fills its container on mobile.
**Rationale**: On mobile the panel is the only column; `max-w-sm` (384px) caps it narrower than the screen and leaves dead space. On desktop, width is naturally constrained by the `xl:w-80` parent column.

### 4. Make toggle button groups full-width on mobile
**Decision**: Change `w-fit` to `w-full` on the coasting mode and mission mode toggle containers, with each button using `flex-1`.
**Rationale**: `w-fit` collapses the toggle to its content width, which on narrow screens may clip or misalign. Full-width buttons are also easier to tap.

### 5. Adjust chart heights for mobile
**Decision**: Use responsive height values for chart containers (smaller on mobile, taller on desktop).
**Rationale**: Fixed `h-48` or `height={160}` values may be appropriate for desktop but waste vertical space on mobile where width is the constraint.

## Risks / Trade-offs

- [Risk] Enabling vertical scroll may cause the 3D canvas to capture touch scroll events → Mitigation: Set `touch-action: none` only on the canvas wrapper, not the whole page.
- [Risk] Full-width toggles may look too spread out on large desktop screens → Mitigation: Apply `w-full` only at mobile breakpoint (`sm:w-fit`), reverting on larger screens.

## Migration Plan

All changes are CSS/JSX only. No API, data model, or routing changes. Deployment is a standard Vite build + Vercel deploy. Rollback is a git revert.
