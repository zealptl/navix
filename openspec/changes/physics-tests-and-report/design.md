## Context

The physics engine (`frontend/src/physics.ts`) implements Rindler constant-acceleration equations for relativistic travel simulation. A unit test file (`physics.test.ts`) already exists with coverage of the core scenarios from the original spec. Two bugs have been fixed post-launch:

1. Star x/y/z coordinates from the HYG catalog are in parsecs; the `recompute()` function in `store.ts` was treating them as light-years (off by factor 3.26156).
2. The `/api/stars/famous` and `/api/stars/search` endpoints were not returning x/y/z, causing `NaN` distances and a permanently disabled play button.

The existing test file lacks: (a) the Sol → Proxima Centauri regression scenario that would have caught the parsec/ly bug, (b) invariant checks (e.g., Earth time > trip distance, ship time < Earth time), (c) keyframe position/distance conservation checks, and (d) any human-readable output showing the expected vs. actual physics values.

## Goals / Non-Goals

**Goals:**
- Add test cases that encode the specific real-world scenarios the simulator must get right, with expected values derived from first principles
- Include invariant tests that catch entire classes of unit/sign bugs without needing known reference values
- Produce a Markdown report after each test run that shows inputs, expected values, actual values, and pass/fail for each scenario — useful for physics review
- Keep test infrastructure minimal: no new test frameworks; use Vitest's built-in reporter API

**Non-Goals:**
- Testing the React/Zustand layer or the backend star API
- Visual/snapshot testing of the 3D map or charts
- Performance benchmarking of the physics engine
- Modifying `physics.ts` itself (tests run against current implementation)

## Decisions

### Decision: Vitest custom reporter for the Markdown report

A custom Vitest reporter (`frontend/src/physics-reporter.ts`) implements the `Reporter` interface and writes `frontend/physics-report.md` after the test suite completes. The reporter collects test names, expected/actual values (embedded in test titles or via a shared registry), and pass/fail status.

**Alternative considered**: A separate Node.js post-processing script that parses Vitest JSON output. Rejected because it requires a two-step command and the JSON output schema is not stable across Vitest versions.

**Alternative considered**: Storing expected/actual in a separate data file and driving both tests and the report from it. Rejected as over-engineering; the report is generated from test results, not the other way around.

### Decision: Expected reference values computed from closed-form Rindler equations

Each reference scenario has its expected values derived analytically in comments within the test file, so reviewers can audit the physics without running code. For Sol → Proxima Centauri (D = 4.244 ly, a = 1g = 1.03156 ly/yr²):

- τ_half = acosh(a·D/2 + 1) / a = acosh(3.190) / 1.03156 ≈ 1.773 yr → τ_total ≈ 3.55 yr
- t_half = sinh(a·τ_half) / a ≈ 2.937 yr → t_total ≈ 5.87 yr
- v_max = tanh(a·τ_half) ≈ 0.950c

For Earth → Tau Ceti (D = 11.91 ly, a = 1g):
- τ_total ≈ 5.15 yr, t_total ≈ 13.7 yr (already in existing tests)

### Decision: Invariant tests as a separate describe block

Physics invariants that must hold for all valid trips (e.g., `t_total > D`, `tau_total < t_total`, phase distances sum to D) are grouped in a dedicated `describe('Physics invariants')` block. This makes regressions immediately identifiable as "invariant violations" rather than just unexpected numbers.

## Risks / Trade-offs

**Vitest reporter API is semi-internal** → Mitigation: pin Vitest version and note reporter interface in a comment; the report failing to write should not fail the test suite (graceful try/catch).

**Reference values baked into tests may drift if physics.ts is intentionally changed** → Mitigation: expected values are computed in comments so reviewers know whether a test failure is a code regression or an intended physics change requiring a test update.

**5% tolerance (TOL = 0.05) is loose** → The existing test suite already uses this; tightening to 1% is deferred until floating-point behaviour across environments is validated.
