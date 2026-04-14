## Why

The physics engine (`physics.ts`) has had critical bugs — coordinates passed in parsecs instead of light-years, and distance calculation producing NaN when star coordinates were missing — that went undetected because there were no automated tests validating the output against known relativistic results. A structured test suite with a human-readable verification report is needed to prevent regressions and build confidence in the simulation's accuracy.

## What Changes

- Expand the existing `physics.test.ts` with comprehensive test cases covering all trip modes, coasting variants, edge cases, and the specific Sol → Proxima Centauri scenario that exposed the parsec/ly unit bug
- Add a Vitest reporter or post-test script that renders a Markdown report (`physics-report.md`) summarizing each test case: input parameters, expected vs. actual values, pass/fail status, and the underlying physics derivation

## Capabilities

### New Capabilities
- `physics-test-suite`: Comprehensive unit tests for all `tripProfile()` and `generateKeyframes()` paths with known relativistic reference values
- `physics-verification-report`: Automated Markdown report generated after each test run showing calculation inputs, expected values, actual values, and pass/fail status

### Modified Capabilities
<!-- none -->

## Impact

- `frontend/src/physics.test.ts` — expanded significantly
- `frontend/src/physics.ts` — no changes; tests run against current implementation
- `frontend/package.json` — may need a `test:report` script
- New file: `frontend/physics-report.md` (generated artifact, gitignored or committed for review)
