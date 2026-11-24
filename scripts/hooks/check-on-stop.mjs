// Claude Code Stop hook: runs the quick checks when the agent finishes a turn
// and sends a failure back to it.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const { stop_hook_active: alreadyBlocked } = JSON.parse(readFileSync(0, 'utf8'))

// Block once per turn, so that a failure the agent can't fix doesn't loop forever.
if (alreadyBlocked) process.exit(0)

const check = spawnSync('npm run check:quick', {
  cwd: path.resolve(import.meta.dirname, '../..'),
  shell: true,
  encoding: 'utf8',
})

if (check.status !== 0) {
  console.error(`npm run check:quick failed. Fix what it found.\n\n${check.stdout}${check.stderr}`)
  process.exit(2)
}
