import { AvitoClient } from './client'
import { extractMfeState, TransformedItem } from './parser'

export class AvitoScrapper {
  private readonly delay = 5000

  constructor(
    private readonly client: AvitoClient,
    private readonly cookies: Record<string, string>
  ) {}

  async fetchPage(url: string) {
    const html = await this.client.fetchHtml(url, this.cookies)
    const page = extractMfeState(html)

    const items = page.state.data.catalog.items
      .filter((item) => item.type === 'item')
      .map((item) => TransformedItem.parse(item, { reportInput: true }))

    return {
      items,
      nextPage: page.state.data.catalog.pager.next,
      totalPages: page.state.data.catalog.pager.pages.length,
    }
  }

  async *fetchPages(url: string) {
    let currentUrl: string | null = url

    while (currentUrl) {
      const page = await this.fetchPage(currentUrl)
      yield page.items
      currentUrl = page.nextPage

      if (currentUrl)
        await new Promise((resolve) => setTimeout(resolve, this.delay))
    }
  }
}
