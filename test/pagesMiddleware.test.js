import { describe, expect, it } from 'vitest'
import { onRequest } from '../functions/_middleware'

const run = (url) => {
  let passed = false
  const response = onRequest({ request: new Request(url), next: () => ((passed = true), new Response('page')) })
  return { response, passed }
}

describe('canonical host middleware', () => {
  it('redirects the pages.dev production host to the real domain, keeping path and query', () => {
    const { response, passed } = run('https://tic-tac-toe-acl.pages.dev/?room=AB2C')
    expect(passed).toBe(false)
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://tictactoe.kayarandomized.com/?room=AB2C')
  })

  it('passes the real domain and preview deployments through', () => {
    expect(run('https://tictactoe.kayarandomized.com/').passed).toBe(true)
    expect(run('https://abc123.tic-tac-toe-acl.pages.dev/').passed).toBe(true)
  })
})
