import type { GameResult } from './ladder'
import type { Difficulty } from './types'

/**
 * What the bot says after a game, by band and result, and how the setup screen describes each
 * band. Two tones are kept: `friendly` (the default, for kids) and `cocky`. Switching between them
 * is a deferred enhancement; see the adaptive-bot spec.
 */
export type Tone = 'friendly' | 'cocky'
export const TONES: Tone[] = ['friendly', 'cocky']

type Pools = Record<Difficulty, Record<GameResult, string[]>>

const FRIENDLY: Pools = {
  easy: {
    win: [
      'Nice one! You got me.',
      'Whoa, three in a row! High five.',
      "You're getting the hang of this!",
      'Well played, champ.',
      "Ooh, I didn't see that coming!",
      'That was a clever move.',
      'Winner winner! Play again?',
      "You're on a roll, keep going!",
      'Great game! Try Medium soon?',
      "Boom! That's how it's done.",
    ],
    loss: [
      'Got you that time! One more?',
      'So close! Watch the corners.',
      "Good try! Let's go again.",
      'Sneaky, right? Now you know my trick.',
      'Almost had me. Rematch?',
      "Don't worry, everyone loses sometimes.",
      'Tip: block me when I have two in a row.',
      'I got lucky! Try again.',
      'Nice moves. Just one more block next time.',
      "You'll get me next round, I can tell.",
    ],
    draw: [
      'A tie! Great defending.',
      'Nobody won, nobody lost. Fun game!',
      'You blocked everything. Nice!',
      'Evenly matched. Again?',
      "A draw is a good sign. You're learning.",
      'Neither of us gave an inch!',
      'Tied up! Want a rematch?',
      "Solid game. Let's do another.",
      "Full board, no winner. That's teamwork.",
      "Good one. I'm warming up now!",
    ],
  },
  medium: {
    win: [
      'Great game! You earned that.',
      'You spotted the fork. Smart!',
      "Okay, you're good at this.",
      'That was a sharp move!',
      'You beat me fair and square.',
      'Nicely played. Rematch?',
      'Wow. I need to think harder!',
      "Awesome! You're climbing fast.",
      'You saw it before I did. Well done.',
      "That's a win to be proud of.",
    ],
    loss: [
      'Good game! That was close.',
      'Nice try. Corners are strong, remember?',
      'I got two ways to win there. Tricky!',
      'You played well. One more?',
      'So close! Keep at it.',
      'That one was tough. Try again?',
      "Watch for my double threats. You've got this.",
      'Great effort. I just got lucky.',
      "Almost! Let's go again.",
      'Every game makes you better. Rematch?',
    ],
    draw: [
      'A draw! You held me off.',
      'Nice defending. That was tight.',
      'Neither of us blinked. Good game!',
      "Tied! You're getting really good.",
      'Solid. Very solid.',
      'You blocked every trick I had.',
      'A draw against me is no small thing.',
      "Even match. Let's break the tie!",
      'Great game. Neither of us slipped.',
      'Well defended! Again?',
    ],
  },
  hard: {
    win: [
      'Wow! You really beat me!',
      'That was brilliant. Seriously.',
      'I did not see that coming. Amazing!',
      'You outplayed me. Take a bow.',
      "Incredible game. You're a pro!",
      'Okay, that was next-level.',
      'You found the one move. Wow.',
      'Beaten by a champion. Well done!',
      "That's a win to tell your friends about.",
      'Superb. Can you do it again?',
    ],
    loss: [
      "Good game! I'm tough up here.",
      "You played well. I'm just really careful.",
      'Close! Keep your eyes on the corners.',
      'Great effort. This level is hard!',
      'Nice try. Want another go?',
      'You made me think. Rematch?',
      "Tough game! You're still doing great.",
      'That was a good fight. Again?',
      "So close. You'll crack me one day.",
      "I'm at my best here. You're keeping up!",
    ],
    draw: [
      "A draw! That's a big deal up here.",
      'You held me to a tie. Impressive!',
      'Perfect defence. Well done.',
      'Nobody beats the board. You matched me!',
      'That was a masterclass in blocking.',
      'Tied with the best. Nice!',
      "You didn't miss a thing. Great game.",
      "Even at Hard. You're really good.",
      'Solid as a rock. Again?',
      'A tie against me? Brag about it!',
      'Every square counted, and you found them all.',
      'We both saw everything. That is rare.',
      'No mistakes from either of us. Respect.',
      'You read every trap. Proper Hard-level play.',
      'A tie with the unbeatable bot is a win in disguise.',
      'Steady hands. You never gave me a gap.',
      'Perfect game from both sides. Once more?',
      'Nothing got past you today.',
      "You're playing like a champion up here.",
      'Draw again? You have this figured out.',
    ],
  },
}

const COCKY: Pools = {
  easy: {
    win: [
      "Okay, okay. Warm-up's over.",
      'I let you have that one.',
      "Beginner's luck. Probably.",
      'Fine. You can count to three.',
      "I wasn't even looking.",
      'Enjoy it. It gets harder.',
      'My tutorial mode. Obviously.',
      'Cute. Do it again.',
      'Congrats, you beat a toddler.',
      "That's one. I'm keeping score.",
    ],
    loss: [
      'Really? On Easy?',
      'I was barely trying.',
      "That's... embarrassing. For you.",
      'Blink and you missed the block.',
      'Even I feel bad about that one.',
      "Warm-up's winning.",
      'You walked right into it.',
      'Maybe try Very Easy. Oh wait.',
      "I'll pretend I didn't see that.",
      'Three in a row. Ring a bell?',
    ],
    draw: [
      'Stalemate. Adorable.',
      'A tie. On Easy. Bold strategy.',
      'Neither of us tried. Fair.',
      'We both get a participation badge.',
      'Nobody won. Nobody cared.',
      'A draw? I was going easy.',
      'Well. That happened.',
      'Call it a practice round.',
      'Half a win. Half a loss. All yours.',
      'Boring. Again?',
    ],
  },
  medium: {
    win: [
      'Lucky square.',
      "Hm. I had that covered. Didn't I?",
      'Fine. Noted for next time.',
      'You saw the fork. Good eyes.',
      "One slip. Don't get used to it.",
      'Okay, that was clean.',
      "I blinked. Won't happen again.",
      'Respect. Grudging, but respect.',
      "You're not bad. For a human.",
      'Rematch. Now.',
    ],
    loss: [
      'Told you it bites back.',
      'That corner was a trap. Obviously.',
      'You went centre. Everyone goes centre.',
      'Blocks. Bites back. Remember?',
      "I'd say good game, but.",
      'Predictable. Comfortably so.',
      "That's a fork. Learn it.",
      "Should've taken the corner.",
      'I do this all day.',
      'Almost. Not really, but almost.',
    ],
    draw: [
      'Nobody blinked.',
      'Even. For now.',
      'You defended. I noticed.',
      'A draw is a loss with manners.',
      "We've both seen this board before.",
      'Solid. Still not a win.',
      'Stalemate. My favourite insult.',
      "You're learning. Slowly.",
      'Cagey. I can be cagier.',
      'Nothing given. Nothing taken.',
    ],
  },
  hard: {
    win: [
      '...Noted.',
      "That shouldn't have happened.",
      'Recalculating.',
      "Enjoy it. It won't repeat.",
      'I underestimated you. Once.',
      'A crack in the wall. Small one.',
      'Hm.',
      "Well played. Don't say I said that.",
      "Someone's been practising.",
      'Impressive. Now do it again.',
    ],
    loss: [
      "Didn't matter, did it.",
      'Bring your best. That was it?',
      "Every move you made, I'd already made.",
      'I saw that four moves ago.',
      'There was no winning line. There never is.',
      'Inevitable.',
      "You're playing checkers. I'm playing this.",
      "Nice try. Tries don't count.",
      'Perfect. Me, not you.',
      'Sit down.',
    ],
    draw: [
      'You held. Barely.',
      'Not a loss. Not a win. Not enough.',
      'Acceptable.',
      'A draw against me is a trophy. Polish it.',
      "You survived. That's the word.",
      'Careful. Very careful. I noticed.',
      'Nobody beats the board.',
      'Stalemate. Same as always.',
      'Well defended. Still standing.',
      "Again. I'm not tired.",
      'A draw. You blinked first, but you blinked well.',
      "Still can't beat me. Nobody can.",
      'Even. As it should be.',
      "I'll allow it.",
      'Close the board, open another. Same result.',
      "You've learned to not lose. Winning is a different class.",
      'Textbook. Mine.',
      'Draw number what, now?',
      "Hold me all day. I'm not going anywhere.",
      'Fine. Deal me in again.',
    ],
  },
}

export const BANTER: Record<Tone, Pools> = { friendly: FRIENDLY, cocky: COCKY }

/** The one-line description under each difficulty on the setup screen. */
export const SETUP_HINTS: Record<Tone, Record<Difficulty, string>> = {
  friendly: {
    easy: 'Go on, warm up.',
    medium: 'I block. Can you?',
    hard: 'My best game. Ready?',
  },
  cocky: {
    easy: 'Go on, warm up.',
    medium: 'Blocks. Bites back.',
    hard: "Bring your best. It won't matter.",
  },
}

/** A line for the band the game was played at and how it went, chosen with `rng` in [0, 1). */
/** A line for the band and result, never the one shown last time (`avoid`) when the pool allows. */
export function banterFor(
  band: Difficulty,
  result: GameResult,
  rng: () => number = Math.random,
  tone: Tone = 'friendly',
  avoid: string | null = null,
): string {
  const full = BANTER[tone][band][result]
  const pool = full.length > 1 ? full.filter((line) => line !== avoid) : full
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]
}
