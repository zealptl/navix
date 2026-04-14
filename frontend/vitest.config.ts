import { defineConfig } from 'vitest/config'
import PhysicsReporter from './src/physics-reporter'

export default defineConfig({
  test: {
    // Run both the default console reporter and our custom Markdown reporter.
    reporters: ['default', new PhysicsReporter()],
  },
})
