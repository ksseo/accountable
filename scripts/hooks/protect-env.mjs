// Claude Code PreToolUse hook: blocks any edit to .env.
import { readFileSync } from 'node:fs'

// Matches .env, but not .env.example or process.env.
const namesEnvFile = /(?<![\w.-])\.env(?!\.?[\w-])/i

const { tool_input: input } = JSON.parse(readFileSync(0, 'utf8'))

// A shell command is refused for naming the file at all, because its text
// doesn't reliably show whether it reads or writes.
const target = input.command ?? input.file_path ?? input.notebook_path ?? ''

if (namesEnvFile.test(target)) {
  console.error('Blocked: only the user edits .env. Tell them what to change instead.')
  process.exit(2)
}
