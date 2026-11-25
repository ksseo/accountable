// Claude Code PreToolUse hook for the reviewer subagent: lets a Bash command
// run only if every command in it is known to read and nothing else.
import { readFileSync } from 'node:fs'

// The shell syntax that's understood. Anything else is refused, such as a
// variable, a substitution, a subshell, a background job or a redirect to a file.
const ignored =
  /[ \t]+|(?<=^|[ \t\n])#[^\n]*|(?<=[ \t])\\\n|[012&]?>>?[ \t]*\/dev\/null(?=[ \t\n;|&]|$)|[12]?>&[12](?=[ \t\n;|&]|$)/y
const separator = /&&|\|\|?|;|\n/y
const word = /(?:[^\s'"\\$`|&;<>(){}#]|(?<=[@^])\{\w*\}|\\\S|'[^']*'|"(?:[^"\\$`]|\\.|\$(?=["|) ]))*")+/y

const readers = new Set(
  'basename cat cd cut diff dirname echo grep head ls nl printf pwd realpath stat tail tr true wc'.split(' '),
)
const gitReaders = new Set(
  (
    'blame cat-file describe diff diff-index diff-tree for-each-ref grep log ls-files ls-tree ' +
    'merge-base name-rev rev-list rev-parse shortlog show show-ref status'
  ).split(' '),
)
const harmlessGitOptions = new Set(['-P', '--no-pager', '--no-optional-locks'])

// Commands that read with some arguments and write with others.
const readsWith = new Map([
  ['git', gitReads],
  ['sed', ([quiet, script, ...files]) => quiet === '-n' && /^[\d,$;p]+$/.test(script) && noOptions(files)],
  ['sort', (args) => args.every((arg) => /^-([bfghnruV]+|k[\d,.nr]+)$/.test(arg))],
  ['uniq', (args) => args.every((arg) => /^-[cdiu]+$/.test(arg))],
])

function noOptions(args) {
  return args.every((arg) => !arg.startsWith('-'))
}

function gitReads(args) {
  const [subcommand, ...options] = withoutGlobalOptions(args)
  if (subcommand === 'branch' || subcommand === 'tag') {
    return options.every((option) => /^(-[alrv]+|--(all|list|remotes|show-current))$/.test(option))
  }
  // --output writes the result to a file.
  if (options.some((option) => /^--ou?(t|=|$)/.test(option))) return false
  // -O opens the matching files in a program.
  if (subcommand === 'grep' && options.some((option) => /^(-\w*O|--op)/.test(option))) return false
  return gitReaders.has(subcommand)
}

function withoutGlobalOptions(args) {
  if (args[0] === '-C') return withoutGlobalOptions(args.slice(2))
  if (harmlessGitOptions.has(args[0])) return withoutGlobalOptions(args.slice(1))
  return args
}

function unquote(text) {
  return text.replace(
    /'([^']*)'|"((?:\\.|[^"\\])*)"|\\(.)/g,
    (_, single, double, escaped) => single ?? double?.replace(/\\([$`"\\])/g, '$1') ?? escaped,
  )
}

function commandsIn(line) {
  const commands = [[]]
  let position = 0
  const take = (pattern) => {
    pattern.lastIndex = position
    const found = pattern.exec(line)?.[0]
    position += found?.length ?? 0
    return found
  }
  while (position < line.length) {
    if (take(ignored)) continue
    const text = take(word)
    if (text) commands.at(-1).push(unquote(text))
    else if (take(separator)) commands.push([])
    else throw new Error(`it has shell syntax that isn't allowed, at: ${line.slice(position, position + 40)}`)
  }
  return commands.filter((command) => command.length > 0)
}

function onlyReads([name, ...args]) {
  return readers.has(name) || readsWith.get(name)?.(args) === true
}

function refuseUnlessItOnlyReads() {
  const { tool_input: input } = JSON.parse(readFileSync(0, 'utf8'))
  const refused = commandsIn(input.command).find((command) => !onlyReads(command))
  if (refused) throw new Error(`this isn't known to only read: ${refused.join(' ')}`)
}

// Claude Code runs the command on any exit code but 2, so an error here has to
// refuse it too.
try {
  refuseUnlessItOnlyReads()
} catch (error) {
  console.error(
    `Blocked: ${error.message}\nThis agent only runs commands that read: git diff, log, show, blame, grep, status and others like them, ` +
      "grep, cat, head, tail, wc, ls, diff, sort, uniq and sed -n '10,20p'. They can be piped and chained, " +
      'without variables, loops or redirects to a file. Use Read, Grep and Glob for the rest.',
  )
  process.exit(2)
}
