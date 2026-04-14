/**
 * physics-reporter.ts — Vitest 4 custom reporter that writes frontend/physics-report.md
 * after every test run. Reporter errors are caught so they never affect the exit code.
 *
 * Uses the Vitest 4 Reporter API (onTestRunEnd, TestModule/TestSuite/TestCase classes).
 * Pin the Vitest version if upgrading, as the Reporter interface is semi-internal.
 */
import type { Reporter, TestModule, TestRunEndReason } from 'vitest'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default class PhysicsReporter implements Reporter {
  onTestRunEnd(
    testModules: ReadonlyArray<TestModule>,
    _unhandledErrors: unknown[],
    _reason: TestRunEndReason,
  ): void {
    try {
      let total = 0
      let passed = 0
      let failed = 0

      const allSuites: Array<{ name: string; tests: ReturnType<typeof Array.from<ReturnType<TestModule['children']['allTests']>>> }> = []

      // Collect suites and their direct test children across all test modules
      const reportSuites: Array<{ name: string; tests: Array<{ name: string; state: string; duration: number | undefined; errorMsg: string | undefined }> }> = []

      for (const module of testModules) {
        for (const suite of module.children.allSuites()) {
          const testRows: Array<{ name: string; state: string; duration: number | undefined; errorMsg: string | undefined }> = []

          for (const test of suite.children.tests()) {
            const result = test.result()
            const diag = test.diagnostic()
            const state = result.state
            total++
            if (state === 'passed') passed++
            else if (state === 'failed') failed++

            let errorMsg: string | undefined
            if (state === 'failed' && result.errors?.length) {
              errorMsg = result.errors[0].message
                .replace(/\n/g, ' ')
                .replace(/\|/g, '\\|')
                .slice(0, 300)
            }

            testRows.push({
              name: test.name,
              state,
              duration: diag?.duration,
              errorMsg,
            })
          }

          if (testRows.length > 0) {
            reportSuites.push({ name: suite.name, tests: testRows })
          }
        }
      }

      const now = new Date().toISOString()
      const lines: string[] = [
        '# Physics Test Report',
        '',
        `**Run:** ${now}  `,
        `**Total:** ${total} | **Passed:** ${passed} ✅ | **Failed:** ${failed} ❌`,
        '',
      ]

      for (const suite of reportSuites) {
        lines.push(`## ${suite.name}`)
        lines.push('')
        lines.push('| Status | Test | Duration |')
        lines.push('|--------|------|----------|')

        for (const test of suite.tests) {
          const icon =
            test.state === 'passed' ? '✅' : test.state === 'failed' ? '❌' : '⏭️'
          const dur = test.duration != null ? `${test.duration.toFixed(1)} ms` : '—'
          const safeName = test.name.replace(/\|/g, '\\|')
          lines.push(`| ${icon} | ${safeName} | ${dur} |`)

          if (test.errorMsg) {
            lines.push(`| | _${test.errorMsg}_ | |`)
          }
        }

        lines.push('')
      }

      // Write to frontend/physics-report.md (process.cwd() = frontend/ when run via npm test)
      const reportPath = resolve(process.cwd(), 'physics-report.md')
      writeFileSync(reportPath, lines.join('\n'), 'utf-8')
      console.log(`\n[physics-reporter] Report written: physics-report.md`)
    } catch (err) {
      // Graceful degradation — reporter errors must not change the test suite exit code
      console.error('[physics-reporter] Failed to write report:', err)
    }
  }
}
