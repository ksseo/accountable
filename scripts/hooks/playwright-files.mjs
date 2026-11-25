// Claude Code PreToolUse hook for the ui-check subagent: the Playwright MCP
// server may save files only in .playwright-mcp/, which git ignores. It takes a
// bare file name as one in the repo root, and any path as a file to overwrite.
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const folder = path.join(root, '.playwright-mcp')

function refuseOutsideFolder() {
  const { filename } = JSON.parse(readFileSync(0, 'utf8')).tool_input
  if (filename === undefined) return
  const inside = path.relative(folder, path.resolve(root, filename))
  if (inside === '' || inside.startsWith('..') || path.isAbsolute(inside)) {
    throw new Error(`${filename} isn't in .playwright-mcp/.`)
  }
}

// Claude Code makes the call on any exit code but 2, so an error here has to
// refuse it too.
try {
  refuseOutsideFolder()
} catch (error) {
  console.error(`Blocked: ${error.message} Use a filename such as .playwright-mcp/dashboard-light.png.`)
  process.exit(2)
}
