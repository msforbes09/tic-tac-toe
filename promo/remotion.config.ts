import { Config } from "@remotion/cli/config"
import { browserExecutable } from "./chrome"

Config.setEntryPoint("src/index.ts")
// Never promo/.env: it holds the voice script's API key, and Studio would serve it to the network.
Config.setDotEnvLocation("remotion.env")
// The committed audio (voices, music, tones) is served as the static folder.
Config.setPublicDir("../docs/promo/audio")
Config.setVideoImageFormat("jpeg")
Config.setJpegQuality(95)
Config.setCodec("h264")
Config.setOverwriteOutput(true)
// The installed Chrome when there is one (see chrome.ts); otherwise Remotion's own headless shell.
const chrome = browserExecutable()
if (chrome) {
  Config.setBrowserExecutable(chrome)
  Config.setChromeMode("chrome-for-testing")
}
