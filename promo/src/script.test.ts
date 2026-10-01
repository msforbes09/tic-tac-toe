import { expect, it } from "vitest"
import { NARRATION } from "./script"

it("reads the narrator script in storyboard order", () => {
  expect(NARRATION.map((s) => s.text).join(" ")).toBe(
    "Tic-tac-toe. You learned it on a napkin. Now it talks back. " +
      "Play a friend online with a room code, share one phone, or take on a bot that gets harder the more you win. " +
      "Forty-one achievements to unlock. Installs as an app, works offline, and it's free. " +
      "Three in a row. Zero excuses. From Kaya Randomized.",
  )
})
