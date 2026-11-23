// Starts and stops the backend and the frontend for the end-to-end tests, on
// ports of their own (8100 and 5273) with a database of their own, so the tests
// never touch real data and can run while `npm run dev` is running (APP-7).
//
// Processes are stopped with tree-kill, so the Python process under `uv run`
// doesn't keep its port on Windows. Their ids are kept in e2e/.run/, because
// the setup, the tests and the teardown run in different processes. On
// Windows `uv` exits when the process that started it exits, leaving Python
// running without it, so a backend restarted inside a test is stopped by its
// port as well.
import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import treeKill from 'tree-kill'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const API_PORT = 8100
export const WEB_PORT = 5273
export const API_URL = `http://127.0.0.1:${API_PORT}`
export const WEB_URL = `http://127.0.0.1:${WEB_PORT}`

const DATA_DIR = path.join(ROOT, 'e2e', '.data')
const RUN_DIR = path.join(ROOT, 'e2e', '.run')
export const TEST_DB = path.join(DATA_DIR, 'accountable-test.db')
const REAL_DB = path.join(ROOT, 'backend', 'data', 'accountable.db')

type Server = 'backend' | 'frontend'

/** The environment for the servers and the seed command, pointed at the test database. */
export function testEnv(): NodeJS.ProcessEnv {
  if (path.resolve(TEST_DB).toLowerCase() === path.resolve(REAL_DB).toLowerCase()) {
    throw new Error(`The tests refuse to use the real database at ${REAL_DB}`)
  }
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ACCOUNTABLE_DB: TEST_DB,
    ACCOUNTABLE_API_PORT: String(API_PORT),
    ACCOUNTABLE_WEB_PORT: String(WEB_PORT),
  }
  // The end-to-end tests use the real date and read it from /api/meta.
  delete env.ACCOUNTABLE_TODAY
  return env
}

const pidFile = (server: Server) => path.join(RUN_DIR, `${server}.pid`)
const logFile = (server: Server) => path.join(RUN_DIR, `${server}.log`)

function kill(pid: number): Promise<void> {
  return new Promise((resolve) => treeKill(pid, 'SIGKILL', () => resolve()))
}

async function answers(url: string): Promise<boolean> {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

async function waitUntil(check: () => Promise<boolean>, what: string, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Timed out waiting for ${what}`)
}

function launch(server: Server, command: string, args: string[], cwd: string): void {
  fs.mkdirSync(RUN_DIR, { recursive: true })
  const log = fs.openSync(logFile(server), 'a')
  const child = spawn(command, args, {
    cwd,
    env: testEnv(),
    stdio: ['ignore', log, log],
    windowsHide: true,
  })
  fs.closeSync(log)
  if (child.pid === undefined) throw new Error(`Could not start the ${server}`)
  fs.writeFileSync(pidFile(server), String(child.pid))
  child.unref()
}

/** The id of the process listening on a local port, or null. */
function listenerOn(port: number): number | null {
  try {
    if (process.platform === 'win32') {
      for (const line of execSync('netstat -ano -p tcp', { encoding: 'utf8' }).split(/\r?\n/)) {
        const [proto, local, , state, pid] = line.trim().split(/\s+/)
        if (proto === 'TCP' && local?.endsWith(`:${port}`) && state === 'LISTENING') return Number(pid)
      }
      return null
    }
    const pid = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).trim().split('\n')[0]
    return pid ? Number(pid) : null
  } catch {
    return null
  }
}

const PORTS: Record<Server, number> = { backend: API_PORT, frontend: WEB_PORT }

async function stop(server: Server): Promise<void> {
  const file = pidFile(server)
  if (fs.existsSync(file)) {
    const pid = Number(fs.readFileSync(file, 'utf8'))
    if (pid) await kill(pid)
    fs.rmSync(file, { force: true })
  }
  const listener = listenerOn(PORTS[server])
  if (listener) await kill(listener)
}

export async function startBackend(): Promise<void> {
  launch(
    'backend',
    'uv',
    ['run', 'uvicorn', 'accountable.main:app', '--host', '127.0.0.1', '--port', String(API_PORT)],
    ROOT,
  )
  await waitUntil(() => answers(`${API_URL}/api/health`), 'the backend')
}

export async function stopBackend(): Promise<void> {
  await stop('backend')
  await waitUntil(async () => !(await answers(`${API_URL}/api/health`)), 'the backend to stop', 20_000)
}

export async function restartBackend(): Promise<void> {
  await stopBackend()
  await startBackend()
}

export async function startFrontend(): Promise<void> {
  const require = createRequire(import.meta.url)
  const vite = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js')
  launch('frontend', process.execPath, [vite], path.join(ROOT, 'frontend'))
  await waitUntil(() => answers(WEB_URL), 'the frontend')
}

export async function stopAll(): Promise<void> {
  await stop('frontend')
  await stop('backend')
}

/** Removes the test database, so the next backend start loads the sample. */
export function removeTestDatabase(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    fs.rmSync(TEST_DB + suffix, { force: true })
  }
}

/** Resets the test database to the sample data with the same command a user runs. */
export function resetData(): void {
  execSync('npm run seed -- --yes', { cwd: ROOT, env: testEnv(), stdio: 'pipe' })
}

/** Loads about 1,000 of each record into the test database, for the speed tests. */
export function loadBulkData(): void {
  execSync('uv run python -m accountable.crm.bulk', { cwd: ROOT, env: testEnv(), stdio: 'pipe' })
}
