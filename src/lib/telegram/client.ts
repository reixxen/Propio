const TELEGRAM_API = 'https://api.telegram.org'

interface SendMessageParams {
  chatId: string
  text: string
  parseMode?: 'HTML' | 'Markdown'
}

const sendMessage = async (
  token: string,
  { chatId, text, parseMode = 'HTML' }: SendMessageParams
) => {
  const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to send message to Telegram: ${response.status} ${response.statusText}`
    )
  }

  const data: unknown = await response.json()

  if (
    data != null &&
    typeof data === 'object' &&
    'ok' in data &&
    data.ok === false
  ) {
    const description =
      'description' in data && typeof data.description === 'string'
        ? data.description
        : 'unknown error'
    throw new Error(`Telegram API error: ${description}`)
  }

  return data
}

export const telegramClient = { sendMessage }
