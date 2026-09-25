const COPYRIGHT_YEAR = 2026

/** The version and copyright line: the splash footer and the room's bottom-right corner. */
export function Colophon() {
  return (
    <>
      v{__APP_VERSION__} · © {COPYRIGHT_YEAR} iam4bs
    </>
  )
}
