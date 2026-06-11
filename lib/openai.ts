import OpenAI from 'openai'

// Lazy singleton: avoids requiring OPENAI_API_KEY at build time.
let client: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })
  }
  return client
}
