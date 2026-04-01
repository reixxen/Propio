import { WallResponse } from './models'

const API_URL = 'https://api.vk.com/method'

export class VkClient {
  constructor(private readonly accessToken: string) {}

  async fetchWall(domain: string, params: { count?: number; v?: string } = {}) {
    const { count = 100, v = '5.199' } = params

    const query = new URLSearchParams({
      v,
      domain,
      count: count.toString(),
    })

    const response = await fetch(`${API_URL}/wall.get?${query}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Wall: ${response.status}`)
    }

    const data = await response.json()

    const result = WallResponse.parse(data.response, {
      reportInput: true,
    })

    return result
  }
}
