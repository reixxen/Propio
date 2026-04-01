import { Output, generateText } from 'ai'
import { google } from '@ai-sdk/google'
import {
  VK_LISTING_PARSER_SYSTEM_PROMPT,
  vkListingParserSchema,
} from './vk-parser.schema'
import {
  VK_CLASSIFIER_SYSTEM_PROMPT,
  vkClassifierSchema,
} from './vk-classifier.schema'

class AiService {
  async classifyVkListing(text: string) {
    const response = await generateText({
      model: google('gemini-flash-lite-latest'),
      output: Output.object({ schema: vkClassifierSchema }),
      system: VK_CLASSIFIER_SYSTEM_PROMPT,
      prompt: `Текст объявления:\n${text}`,
      temperature: 0,
    })

    return response.output
  }

  async parseVkListing(text: string) {
    const response = await generateText({
      model: google('gemini-flash-lite-latest'),
      output: Output.object({ schema: vkListingParserSchema }),
      system: VK_LISTING_PARSER_SYSTEM_PROMPT,
      prompt: `Текст объявления:\n${text}`,
      temperature: 0,
    })

    return response.output
  }
}

export const aiService = new AiService()
