// ESLint for all the TypeScript and JavaScript in the repo: the app, the
// end-to-end tests, the scripts and the config files.
import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores([
    // Not the app.
    '.claude/',
    '.venv/',
    'backend/',
    'community_contributions/',
    'course/',
    'docs/',
    // Generated.
    '.playwright-mcp/',
    'playwright-report/',
    'test-results/',
    'frontend/dist/',
    'frontend/src/api/schema.d.ts',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  { rules: { complexity: ['error', 15] } },
  {
    files: ['frontend/src/**'],
    extends: [reactHooks.configs.flat.recommended, jsxA11y.flatConfigs.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['scripts/**', '*.config.*', 'frontend/*.config.*'],
    languageOptions: { globals: globals.node },
  },
])
