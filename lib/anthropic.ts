import Anthropic from '@anthropic-ai/sdk'

// Lazy singleton: avoids requiring ANTHROPIC_API_KEY at build time.
let client: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })
  }
  return client
}
