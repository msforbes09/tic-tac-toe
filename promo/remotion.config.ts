import { Config } from "@remotion/cli/config"

Config.setEntryPoint("src/index.ts")
// Never promo/.env: it holds the voice script's API key, and Studio would serve it to the network.
Config.setDotEnvLocation("remotion.env")
// The committed audio (voices, music, tones) is served as the static folder.
Config.setPublicDir("../docs/promo/audio")
Config.setVideoImageFormat("jpeg")
Config.setJpegQuality(95)
Config.setCodec("h264")
Config.setOverwriteOutput(true)
// REMOTION_CHROME points at an installed Chrome; unset, Remotion fetches its own headless shell once.
if (process.env.REMOTION_CHROME) {
  Config.setBrowserExecutable(process.env.REMOTION_CHROME)
  Config.setChromeMode("chrome-for-testing")
}
