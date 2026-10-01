// The spoken words, exactly as storyboard section 4 writes them, in the order they are spoken.

export const NARRATION = [
  { key: '1', text: 'Tic-tac-toe.' },
  { key: '2', text: 'You learned it on a napkin.' },
  { key: '3', text: 'Now it talks back.' },
  { key: '4a', text: 'Play a friend online with a room code,' },
  { key: '4b', text: 'share one phone,' },
  { key: '4c', text: 'or take on a bot that gets harder the more you win.' },
  { key: '5', text: 'Forty-one achievements to unlock.' },
  { key: '6', text: "Installs as an app, works offline, and it's free." },
  { key: '7', text: 'Three in a row. Zero excuses.' },
  { key: '8', text: 'From Kaya Randomized.' },
] as const

export type Sentence = (typeof NARRATION)[number]['key']

export const BOT_LINES = {
  'bot-01': 'I do this all day.',
  'bot-02': 'Lucky square.',
} as const

export type BotLine = keyof typeof BOT_LINES
