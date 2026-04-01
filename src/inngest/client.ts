import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'rental-parser',
  isDev: process.env.NODE_ENV === 'development',
})
