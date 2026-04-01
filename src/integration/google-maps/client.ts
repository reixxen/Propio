import { GeocodeResponse } from './models'

const API_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

export class GoogleMapsClient {
  constructor(private readonly apiKey: string) {}

  async geocode(address: string, city: string) {
    const query = new URLSearchParams({
      address,
      components: `country:RU|locality:${city}`,
      language: 'ru',
      key: this.apiKey,
    })

    return this.fetchGeocode(query)
  }

  async reverseGeocode(lat: number, lng: number) {
    const query = new URLSearchParams({
      latlng: `${lat},${lng}`,
      language: 'ru',
      key: this.apiKey,
    })

    return this.fetchGeocode(query)
  }

  private async fetchGeocode(query: URLSearchParams): Promise<GeocodeResponse> {
    const response = await fetch(`${API_URL}?${query}`)
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.statusText}`)
    }

    const data = await response.json()

    return GeocodeResponse.parse(data)
  }
}
