export type ShareResult = 'shared' | 'copied' | 'failed'
export type ShareLink = (link: string) => Promise<ShareResult>

export type ShareNavigator = {
  share?: (data: { url: string }) => Promise<void>
  clipboard?: { writeText: (text: string) => Promise<void> }
}

/** Web Share sheet where there is one, otherwise the clipboard. */
export function createShareLink(nav: ShareNavigator): ShareLink {
  return async (link) => {
    if (nav.share) {
      try {
        await nav.share({ url: link })
        return 'shared'
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'shared'
      }
    }
    if (!nav.clipboard) return 'failed'
    try {
      await nav.clipboard.writeText(link)
      return 'copied'
    } catch {
      return 'failed'
    }
  }
}

export const shareLink: ShareLink = (link) =>
  createShareLink({
    share: typeof navigator !== 'undefined' && navigator.share ? (d) => navigator.share(d) : undefined,
    clipboard: typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard : undefined,
  })(link)
