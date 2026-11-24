// npm run dev: starts the backend and the frontend, waits until both answer,
// prints the address and opens it in the browser (APP-5). Ctrl+C stops both.
//
// ACCOUNTABLE_API_PORT and ACCOUNTABLE_WEB_PORT move the ports (8000 and 5173).
// Pass --no-open to skip opening the browser.
import concurrently from 'concurrently'
import { createRequire } from 'node:module'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import open from 'open'

const apiPort = Number(process.env.ACCOUNTABLE_API_PORT ?? 8000)
const webPort = Number(process.env.ACCOUNTABLE_WEB_PORT ?? 5173)
const host = '127.0.0.1'
const appUrl = `http://${host}:${webPort}`
const READY_TIMEOUT_MS = 90_000

function portIsFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, host)
  })
}

async function answers(url) {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

async function waitFor(url, deadline) {
  while (Date.now() < deadline) {
    if (await answers(url)) return true
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  return false
}

for (const port of [apiPort, webPort]) {
  if (!(await portIsFree(port))) {
    console.error(`포트 ${port}을 다른 프로그램이 쓰고 있어요. 그 프로그램을 닫고 다시 실행해 주세요.`)
    process.exit(1)
  }
}

// The children read the ports from here: Vite's config and its proxy use them.
process.env.ACCOUNTABLE_API_PORT = String(apiPort)
process.env.ACCOUNTABLE_WEB_PORT = String(webPort)

// Vite is run by Node, not by npm. On Windows npm is a batch file, and Ctrl+C
// makes a batch file ask whether to stop, in letters that come out broken.
const frontend = fileURLToPath(new URL('../frontend/', import.meta.url))
const require = createRequire(path.join(frontend, 'package.json'))
const vite = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js')

console.log('Accountable을 시작하고 있어요...')

const { result } = concurrently(
  [
    {
      name: 'api',
      command: `uv run uvicorn accountable.main:app --host ${host} --port ${apiPort} --log-level warning`,
      prefixColor: 'green',
    },
    {
      name: 'web',
      command: `node "${vite}" --logLevel warn`,
      cwd: frontend,
      prefixColor: 'cyan',
    },
  ],
  { killOthersOn: ['failure', 'success'], prefix: 'name' },
)

let stopping = false
result.then(
  () => process.exit(0),
  () => process.exit(stopping ? 0 : 1),
)
process.on('SIGINT', () => {
  stopping = true
})

const deadline = Date.now() + READY_TIMEOUT_MS
const ready =
  (await waitFor(`http://${host}:${apiPort}/api/health`, deadline)) && (await waitFor(appUrl, deadline))

if (!ready) {
  console.error('서버가 제때 시작되지 않았어요. 위의 메시지를 확인해 주세요.')
} else {
  console.log('')
  console.log(`  Accountable이 준비됐어요: ${appUrl}`)
  console.log('  끝내려면 Ctrl+C를 누르세요.')
  console.log('')
  if (!process.argv.includes('--no-open')) {
    open(appUrl).catch(() => {
      console.log(`  브라우저를 열지 못했어요. 위 주소를 직접 열어 주세요.`)
    })
  }
}
