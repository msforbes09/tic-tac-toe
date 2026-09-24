import { describe, expect, it, vi } from 'vitest'
import { createShareLink } from './share'

describe('share link', () => {
  it('uses the share sheet when there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const result = await createShareLink({ share })('https://x.test/?room=AB2C')
    expect(share).toHaveBeenCalledWith({ url: 'https://x.test/?room=AB2C' })
    expect(result).toBe('shared')
  })

  it('treats a dismissed share sheet as shared (nothing to report)', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('dismissed', 'AbortError'))
    expect(await createShareLink({ share })('https://x.test/?room=AB2C')).toBe('shared')
  })

  it('copies when there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    expect(await createShareLink({ clipboard: { writeText } })('https://x.test/?room=AB2C')).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('https://x.test/?room=AB2C')
  })

  it('falls back to copying when sharing fails for another reason', async () => {
    const share = vi.fn().mockRejectedValue(new Error('not allowed'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    expect(await createShareLink({ share, clipboard: { writeText } })('https://x.test/')).toBe('copied')
  })

  it('reports failure when nothing works', async () => {
    expect(await createShareLink({})('https://x.test/')).toBe('failed')
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    expect(await createShareLink({ clipboard: { writeText } })('https://x.test/')).toBe('failed')
  })
})
