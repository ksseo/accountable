import {
  API_PORT,
  WEB_PORT,
  removeTestDatabase,
  startBackend,
  startFrontend,
  stopAll,
} from './support/servers'
import net from 'node:net'

function portIsFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, '127.0.0.1')
  })
}

/** A fresh test database with the sample data, and both servers started. */
export default async function globalSetup(): Promise<void> {
  // Servers left over from a run that was stopped halfway.
  await stopAll()
  for (const port of [API_PORT, WEB_PORT]) {
    if (!(await portIsFree(port))) {
      throw new Error(`Port ${port} is taken. Close whatever is using it and run the tests again.`)
    }
  }
  removeTestDatabase()
  await startBackend()
  await startFrontend()
}
