## 1. Zone State in StarMap3D

- [x] 1.1 Define a `ZoneTier` type (`'famous' | 'naked-eye' | 'binocular' | 'all'`) and a `ZONE_TIERS` config array with label, tier key, and fetch URL for each tier
- [x] 1.2 Replace the Zone 1 `stars` state with a state pair: `stars: Star[]` + `activeTier: ZoneTier` (default `'famous'`)
- [x] 1.3 Replace the startup `fetch('/api/stars/nearby?ly=200&max_mag=8')` call with a fetch from `/api/stars/famous` for the Famous tier default

## 2. Additive Merge Logic

- [x] 2.1 Write a `mergeStars(existing: Star[], incoming: Star[]): Star[]` helper that deduplicates by `id` using a Map
- [x] 2.2 Wire `mergeStars` into the fetch handler so clicking a higher tier appends new stars without replacing existing ones

## 3. ZoneSelectorOverlay Component

- [x] 3.1 Create a `ZoneSelectorOverlay` component that receives `activeTier` and `onSelect(tier)` props and renders four labeled buttons
- [x] 3.2 Style active tier button with a highlighted appearance (e.g. white text + opaque background) and inactive buttons with muted style matching the existing Reset View aesthetic
- [x] 3.3 Guard the `onSelect` handler to no-op if the clicked tier is already active

## 4. Layout Integration

- [x] 4.1 Mount `ZoneSelectorOverlay` as an absolute-positioned overlay in the top-left of the `StarMap3D` container div (mirroring Reset View placement at top-right)
- [x] 4.2 Pass `activeTier` and a `handleZoneSelect` callback from `StarMap3D` down to the overlay

## 5. Verification

- [x] 5.1 Confirm default load shows only famous stars (~10–25 points), not hundreds
- [x] 5.2 Confirm clicking each tier adds more stars without a flash or duplicate points
- [x] 5.3 Confirm clicking the already-active tier triggers no fetch
