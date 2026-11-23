import { describe, expect, it } from 'vitest'
import { ApiError, unwrap } from './client'

function result(status: number, body: unknown) {
  const response = new Response(JSON.stringify(body), { status })
  return Promise.resolve({ data: status < 300 ? body : undefined, error: status < 300 ? undefined : body, response })
}

describe('unwrap', () => {
  it('gives back the data of a successful call', async () => {
    await expect(unwrap(result(200, { id: 1 }))).resolves.toEqual({ id: 1 })
  })

  it('turns a 422 into an ApiError naming each wrong field', async () => {
    const body = {
      detail: [
        { loc: ['body', 'email'], msg: 'bad email', type: 'value_error' },
        { loc: ['body', 'name'], msg: 'too short', type: 'string_too_short' },
      ],
    }
    const error = await unwrap(result(422, body)).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(422)
    expect((error as ApiError).fields).toEqual({ email: 'value_error', name: 'string_too_short' })
  })

  it('keeps the message of a 404 or 409', async () => {
    const error = (await unwrap(result(409, { detail: 'automatic entry' })).catch((e: unknown) => e)) as ApiError
    expect(error.status).toBe(409)
    expect(error.message).toBe('automatic entry')
    expect(error.offline).toBe(false)
  })
})
