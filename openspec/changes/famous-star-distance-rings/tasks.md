## 1. DistanceRings Component — Core Geometry

- [x] 1.1 Add `DistanceRings` component skeleton to `StarMap3D.tsx`, accepting `stars: Star[]` and `opacity: number` props
- [x] 1.2 In `DistanceRings`, filter `stars` to only those with `distance_ly <= 100`
- [x] 1.3 For each filtered star, create a `RingGeometry` (innerRadius = distance_ly - 0.15, outerRadius = distance_ly + 0.15, segments = 128) flat on y = 0 using `useMemo`
- [x] 1.4 Apply `meshBasicMaterial` to each ring using `spectralColor(star.spectral_type)`, `transparent: true`, `side: THREE.DoubleSide`, `depthWrite: false`

## 2. Drop-lines

- [x] 2.1 For each ring star, compute galactic elevation: `elevLy = star.y * PC_TO_LY`
- [x] 2.2 If `Math.abs(elevLy) >= 0.1`, render a `<Line>` from `[starX, 0, starZ]` to `[starX, starY_ly, starZ]` using `@react-three/drei`, color matching spectral type, opacity = 0.2
- [x] 2.3 Skip drop-line (render nothing) when elevation < 0.1 ly

## 3. Labels

- [x] 3.1 Sort filtered stars by `distance_ly` ascending, then assign default label angle = 0 (i.e. anchor at `(0, 0, distance_ly)`)
- [x] 3.2 Walk the sorted list: if a star's radius is within 0.5 ly of the previous star's radius, rotate its label anchor by +45° around the ring (accumulate offset for multiple close stars)
- [x] 3.3 Compute label world position: `(Math.sin(angleRad) * distance_ly, 0.3, Math.cos(angleRad) * distance_ly)`
- [x] 3.4 Render a `<Html>` label at the computed position with text `"<proper_name>  <distance_ly.toFixed(1)> ly"`, styled small and semi-transparent matching the ring color

## 4. LOD Opacity Fade

- [x] 4.1 In the parent `Scene` or `DistanceRings` via `useFrame`, compute `zone1Opacity = 1 - smoothstep(100, 300, camera.position.length())`
- [x] 4.2 Pass `zone1Opacity` as the `opacity` prop to `DistanceRings`; ring materials use `opacity * 0.35`, drop-lines use `opacity * 0.2`
- [x] 4.3 When `opacity` reaches 0 (`showRings` is off or camera too far), skip rendering via early return

## 5. Toggle Button

- [x] 5.1 Add `const [showRings, setShowRings] = useState(true)` to the `StarMap3D` component
- [x] 5.2 Add a `Rings` toggle button in the zone-tier control bar (same style as existing tier buttons), toggling `showRings`
- [x] 5.3 Conditionally render `<DistanceRings>` only when `showRings === true` (or pass prop to suppress rendering)

## 6. Integration & Verification

- [x] 6.1 Confirm rings appear at correct radii by cross-checking a few stars: Proxima (4.24 ly), Sirius (8.6 ly), Vega (25 ly)
- [x] 6.2 Confirm Proxima / Alpha Cen labels do not overlap (angular stagger applied)
- [x] 6.3 Confirm rings fade out smoothly as camera zooms out past 100 ly and are gone by 300 ly
- [x] 6.4 Confirm Polaris and Betelgeuse have no rings
- [x] 6.5 Confirm toggle button hides and shows all rings, drop-lines, and labels
