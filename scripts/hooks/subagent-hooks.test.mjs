// The hooks of the two subagents, run as Claude Code runs them: the tool call
// comes in as JSON, and exit code 2 refuses it.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { describe, test } from 'node:test'

const root = path.resolve(import.meta.dirname, '../..')

function exitCode(hook, stdin) {
  return spawnSync(process.execPath, [path.join(import.meta.dirname, hook)], { input: stdin }).status
}

function expectExit(hook, code, inputs) {
  for (const input of inputs) {
    test(JSON.stringify(input), () => {
      assert.equal(exitCode(hook, JSON.stringify({ tool_input: input })), code)
    })
  }
}

const ALLOWED = 0
const REFUSED = 2

const commands = (lines) => lines.map((command) => ({ command }))
const filenames = (names) => names.map((filename) => ({ filename }))

describe('the reviewer may read', () => {
  expectExit(
    'read-only.mjs',
    ALLOWED,
    commands([
      'git diff main...HEAD',
      'git --no-pager log --oneline -20 main..HEAD',
      'git log --pretty=format:"%h %an %s" --since=\'2 weeks ago\'',
      'git -C "D:\\Test\\accountable" show HEAD:docs/spec.md',
      "git diff main...HEAD -- . ':(exclude)package-lock.json'",
      'git show HEAD@{1} HEAD^{commit} HEAD~2',
      'git diff --ours',
      "git grep -nE 'useState|useEffect' -- 'frontend/src/*.tsx'",
      'git grep --only-matching foo',
      'git blame -L 10,20 docs/spec.md',
      'git status --short && git branch -a && git branch --show-current && git tag',
      'grep -rn --include=*.ts "LOOK-\\d+$" frontend/src | head -n 20',
      "grep -c '$(x) > `y`' notes.md",
      'cd /d/Test/accountable && cat docs/spec.md 2>/dev/null | wc -l',
      "git show HEAD:docs/spec.md | sed -n '10,20p;30p'",
      'git diff --name-only main | sort -u | uniq -c 2>&1 | head',
      'grep foo a.txt || echo "no match"; echo done',
      "# what's changed\ngit diff --stat \\\n  main # and its name\ngit status",
    ]),
  )
})

describe('the reviewer may not change anything', () => {
  expectExit(
    'read-only.mjs',
    REFUSED,
    commands([
      'rm -rf docs',
      'git commit -am x',
      'git checkout main',
      'git push',
      'git fetch',
      'git stash',
      'git branch new-branch',
      'git tag -d v1',
      'git -c core.pager=touch log',
      'git -C . commit -am x',
      'npm run check',
      'node -e 1',
      'find . -delete',
      'ls | xargs rm',
      'git diff && rm a.txt',
      'git diff; rm a.txt',
      'git diff | tee a.txt',
      'git diff\nrm a.txt',
      'git log & rm a.txt',
      'constructor',
    ]),
  )
})

describe('the reviewer may not write with a command that reads', () => {
  expectExit(
    'read-only.mjs',
    REFUSED,
    commands([
      'git diff > a.txt',
      'cat b.txt >> a.txt',
      'git diff 2>/dev/null.txt',
      'git diff --output=a.txt',
      'git diff --output a.txt',
      'git diff "--out"put=a.txt',
      'git diff --out\\put=a.txt',
      'git diff {--output=a.txt,}',
      'git diff -\\\n-output=a.txt',
      "git grep -O'touch a.txt' foo",
      'git grep -nOtouch foo',
      'git grep --open-files-in-pager=touch foo',
      "sed -i 's/a/b/' a.txt",
      "sed -n 'w a.txt' b.txt",
      'sed -n 1p a.txt -i',
      'sort -uo a.txt b.txt',
      'uniq a.txt b.txt',
    ]),
  )
})

describe('the reviewer may not hide a command', () => {
  expectExit(
    'read-only.mjs',
    REFUSED,
    commands([
      'echo $(rm a.txt)',
      'echo `rm a.txt`',
      'echo "$(rm a.txt)"',
      'echo <(rm a.txt)',
      '(rm a.txt)',
      '{ rm a.txt; }',
      'for f in *; do rm $f; done',
      'PAGER=touch git log',
      'git $x',
      "git $'commit'",
      "echo a # it's\nrm a.txt\n# '",
      'echo a#; rm a.txt',
      'cat <<EOF\nEOF',
    ]),
  )
})

describe('ui-check may save in .playwright-mcp/', () => {
  expectExit('playwright-files.mjs', ALLOWED, [
    { url: 'http://127.0.0.1:5173/' },
    ...filenames([
      '.playwright-mcp/dashboard-light.png',
      './.playwright-mcp/dashboard-light.png',
      path.join(root, '.playwright-mcp', 'dashboard-light.png'),
    ]),
  ])
})

describe('ui-check may not save anywhere else', () => {
  expectExit(
    'playwright-files.mjs',
    REFUSED,
    filenames([
      'dashboard-light.png',
      'frontend/src/main.tsx',
      '.playwright-mcp',
      '.playwright-mcp/../AGENTS.md',
      '.playwright-mcp-2/dashboard-light.png',
      path.join(root, 'dashboard-light.png'),
      path.resolve('/dashboard-light.png'),
    ]),
  )
})

describe('a call that a hook cannot read is refused', () => {
  for (const hook of ['read-only.mjs', 'playwright-files.mjs']) {
    test(hook, () => {
      assert.equal(exitCode(hook, 'not JSON'), REFUSED)
      assert.equal(exitCode(hook, '{}'), REFUSED)
    })
  }
})
