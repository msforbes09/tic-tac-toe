// Which Chrome renders the film. REMOTION_CHROME wins when set; otherwise the installed Google Chrome on a
// Mac (a local setting for this machine); otherwise null, and Remotion fetches its own headless shell once.
import { existsSync } from "node:fs"

const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

export function browserExecutable(): string | null {
  if (process.env.REMOTION_CHROME) return process.env.REMOTION_CHROME
  return existsSync(MAC_CHROME) ? MAC_CHROME : null
}
