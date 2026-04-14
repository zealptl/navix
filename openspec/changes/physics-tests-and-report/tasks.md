## 1. Reference Scenario Tests

- [x] 1.1 Add `describe('Sol → Proxima Centauri reference scenario')` block to `physics.test.ts` with the D = 4.244 ly, 1g, stop, no-coast case; assert `totalTau ≈ 3.55 yr` and `totalT ≈ 5.87 yr` within 5% tolerance
- [x] 1.2 Assert `totalT > 4.244` (Earth time must exceed trip distance) in the Proxima scenario
- [x] 1.3 Assert `maxVelocity ≈ 0.95c` within 5% in the Proxima scenario
- [x] 1.4 Add comments above each assertion showing the closed-form derivation (acosh / sinh steps) so reviewers can audit the expected values without running code

## 2. Physics Invariant Tests

- [x] 2.1 Add `describe('Physics invariants')` block; define a `checkInvariants(result, distance)` helper that asserts all invariants against a `tripProfile` result
- [x] 2.2 Assert `totalT > totalTau` (time dilation) in the invariant helper
- [x] 2.3 Assert `totalT > distance` (subluminal travel) in the invariant helper
- [x] 2.4 Assert `sum(phase.distance) ≈ totalDistance` within 1e-9 in the invariant helper
- [x] 2.5 Assert `sum(phase.tauDuration) ≈ totalTau` within 1e-9 in the invariant helper
- [x] 2.6 Assert `sum(phase.tDuration) ≈ totalT` within 1e-9 in the invariant helper
- [x] 2.7 Assert all `velocityStart` and `velocityEnd` values are in `[0, 1)` in the invariant helper
- [x] 2.8 Call `checkInvariants` for at least 5 diverse cases: (Proxima 1g stop), (Tau Ceti 1g stop), (Tau Ceti 0.5g coast-fraction), (Tau Ceti 1g target-speed), (Tau Ceti 1g flyby)

## 3. Keyframe Conservation Tests

- [x] 3.1 Add `describe('Keyframe conservation')` block
- [x] 3.2 Assert `frames[N-1].x ≈ profile.totalDistance` within 1% for a stop-mode trip
- [x] 3.3 Assert all `frame.tau` values are monotonically non-decreasing
- [x] 3.4 Assert all `frame.x` values are monotonically non-decreasing for stop and flyby modes
- [x] 3.5 Assert all `frame.t` values are monotonically non-decreasing

## 4. Flyby and Coasting Precision Tests

- [x] 4.1 Add a test asserting flyby `totalT < stop totalT` for the same parameters (Tau Ceti, 1g)
- [x] 4.2 Add a test asserting `totalDistance == input distance` for flyby mode
- [x] 4.3 Add a test asserting the coasting phase `velocityStart === targetSpeed` (within 1e-6) when an achievable target speed is requested in stop mode

## 5. Vitest Custom Reporter

- [x] 5.1 Create `frontend/src/physics-reporter.ts` implementing the Vitest `Reporter` interface; on `onFinished`, write `frontend/physics-report.md`
- [x] 5.2 Report header: title, run timestamp (ISO 8601), total / passed / failed counts
- [x] 5.3 Report body: one `##` section per `describe` block; each test as a table row with status icon (✅/❌), test name, and duration in ms
- [x] 5.4 Failed test entries include the assertion error message
- [x] 5.5 Wrap the file-write in a try/catch so reporter errors do not change the test suite exit code
- [x] 5.6 Register the reporter in `frontend/vitest.config.ts` (or `vite.config.ts` test config) alongside the default reporter

## 6. npm Script and Verification

- [x] 6.1 Add `"test:report": "vitest run"` script to `frontend/package.json` (the reporter runs automatically via config; the script just provides a named alias)
- [x] 6.2 Run `npm test` in the frontend directory and confirm all new tests pass
- [x] 6.3 Confirm `frontend/physics-report.md` is generated and contains the correct structure (header, sections, pass/fail rows)
- [x] 6.4 Add `physics-report.md` to `.gitignore` in the frontend directory (generated artifact) OR commit it intentionally for review — document the choice in a comment in the script
