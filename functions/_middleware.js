// Cloudflare Pages middleware: the project's pages.dev address forwards to the real domain, so
// room links and bookmarks always carry one address. Preview deployments
// (<hash>.tic-tac-toe-acl.pages.dev) and the real domain pass straight through to the static files.
const PAGES_HOST = 'tic-tac-toe-acl.pages.dev'
const CANONICAL_ORIGIN = 'https://tic-tac-toe.iam4bs.dev'

export function onRequest({ request, next }) {
  const url = new URL(request.url)
  if (url.hostname === PAGES_HOST) {
    return Response.redirect(`${CANONICAL_ORIGIN}${url.pathname}${url.search}`, 301)
  }
  return next()
}
