import { stopAll } from './support/servers'

export default async function globalTeardown(): Promise<void> {
  await stopAll()
}
