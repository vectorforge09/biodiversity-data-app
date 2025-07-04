// API configuration and client for FastAPI backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// Generic API request function with error handling and retries
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  }

  let lastError: Error | null = null
  const maxRetries = 3

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(url, {
        ...defaultOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData,
        )
      }

      return await response.json()
    } catch (error) {
      lastError = error as Error

      if (error instanceof ApiError) {
        throw error
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("Request timeout - server may be unavailable")
      }

      // Network error - retry if not the last attempt
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
        continue
      }
    }
  }

  throw new ApiError("Network error or server unavailable", 0, lastError)
}

// API functions for different endpoints
export const api = {
  // Search for species
  searchSpecies: async (query: string, limit = 10) => {
    if (!query || query.length < 2) {
      return { results: [], total: 0, queryTimeMs: 0 }
    }

    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    })

    return apiRequest(`/api/v1/species/search?${params}`)
  },

  // Get observations for a species
  getObservations: async (speciesId: string, limit = 300) => {
    return apiRequest(`/api/v1/species/${speciesId}/observations?limit=${limit}`)
  },

  // Get species details
  getSpeciesDetails: async (speciesId: string) => {
    return apiRequest(`/api/v1/species/${speciesId}`)
  },

  // Get biodiversity statistics
  getStats: async () => {
    return apiRequest("/api/v1/stats")
  },

  // Health check
  healthCheck: async () => {
    return apiRequest("/health")
  },
}

// Add more comprehensive mock data for better visualization testing
export const mockData = {
  species: [
    {
      id: "2684876",
      scientificName: "Pinus sylvestris",
      vernacularName: "Scots Pine",
      kingdom: "Plantae",
      phylum: "Tracheophyta",
      class: "Pinopsida",
      order: "Pinales",
      family: "Pinaceae",
      genus: "Pinus",
    },
    {
      id: "5219404",
      scientificName: "Cervus elaphus",
      vernacularName: "Red Deer",
      kingdom: "Animalia",
      phylum: "Chordata",
      class: "Mammalia",
      order: "Artiodactyla",
      family: "Cervidae",
      genus: "Cervus",
    },
    {
      id: "2878688",
      scientificName: "Quercus robur",
      vernacularName: "English Oak",
      kingdom: "Plantae",
      phylum: "Tracheophyta",
      class: "Magnoliopsida",
      order: "Fagales",
      family: "Fagaceae",
      genus: "Quercus",
    },
    {
      id: "5284517",
      scientificName: "Lynx lynx",
      vernacularName: "Eurasian Lynx",
      kingdom: "Animalia",
      phylum: "Chordata",
      class: "Mammalia",
      order: "Carnivora",
      family: "Felidae",
      genus: "Lynx",
    },
    {
      id: "2882316",
      scientificName: "Fagus sylvatica",
      vernacularName: "European Beech",
      kingdom: "Plantae",
      phylum: "Tracheophyta",
      class: "Magnoliopsida",
      order: "Fagales",
      family: "Fagaceae",
      genus: "Fagus",
    },
    {
      id: "2480946",
      scientificName: "Aquila chrysaetos",
      vernacularName: "Golden Eagle",
      kingdom: "Animalia",
      phylum: "Chordata",
      class: "Aves",
      order: "Accipitriformes",
      family: "Accipitridae",
      genus: "Aquila",
    },
  ],

  observations: [
    // Pinus sylvestris observations
    {
      id: "2684876_obs_1",
      speciesId: "2684876",
      eventDate: "2023-06-15",
      decimalLatitude: 52.2297,
      decimalLongitude: 21.0122,
      locality: "Warsaw, Mazowieckie, Poland",
      recordedBy: "Forest Survey Team",
      institutionCode: "DEMO",
      basisOfRecord: "HUMAN_OBSERVATION",
    },
    {
      id: "2684876_obs_2",
      speciesId: "2684876",
      eventDate: "2023-07-20",
      decimalLatitude: 50.0647,
      decimalLongitude: 19.945,
      locality: "Kraków, Małopolskie, Poland",
      recordedBy: "Botanical Survey",
      institutionCode: "DEMO",
      basisOfRecord: "HUMAN_OBSERVATION",
    },
    {
      id: "2684876_obs_3",
      speciesId: "2684876",
      eventDate: "2022-08-10",
      decimalLatitude: 53.4285,
      decimalLongitude: 14.5528,
      locality: "Szczecin, Zachodniopomorskie, Poland",
      recordedBy: "Nature Guide",
      institutionCode: "DEMO",
      basisOfRecord: "HUMAN_OBSERVATION",
    },
    {
      id: "2684876_obs_4",
      speciesId: "2684876",
      eventDate: "2022-05-12",
      decimalLatitude: 49.2992,
      decimalLongitude: 19.9496,
      locality: "Zakopane, Małopolskie, Poland",
      recordedBy: "Mountain Researcher",
      institutionCode: "DEMO",
      basisOfRecord: "HUMAN_OBSERVATION",
    },
    {
      id: "2684876_obs_5",
      speciesId: "2684876",
      eventDate: "2021-09-03",
      decimalLatitude: 51.7592,
      decimalLongitude: 19.456,
      locality: "Łódź, Łódzkie, Poland",
      recordedBy: "Urban Forester",
      institutionCode: "DEMO",
      basisOfRecord: "HUMAN_OBSERVATION",
    },
    {
      id: "2684876_obs_6",
      speciesId: "2684876",
      eventDate: "2021-04-18",
      decimalLatitude: 54.352,
      decimalLongitude: 18.6466,
      locality: "Gdańsk, Pomorskie, Poland",
      recordedBy: "Coastal Survey",
      institutionCode: "DEMO",
      basisOfRecord: "HUMAN_OBSERVATION",
    },
    // Cervus elaphus observations
    {
      id: "5219404_obs_1",
      speciesId: "5219404",
      eventDate: "2023-05-12",
      decimalLatitude: 49.2992,
      decimalLongitude: 19.9496,
      locality: "Zakopane, Małopolskie, Poland",
      recordedBy: "Wildlife Researcher",
      institutionCode: "DEMO",
      basisOfRecord: "HUMAN_OBSERVATION",
    },
    {
      id: "5219404_obs_2",
      speciesId: "5219404",
      eventDate: "2023-09-03",
      decimalLatitude: 51.7592,
      decimalLongitude: 19.456,
      locality: "Łódź Forest, Łódzkie, Poland",
      recordedBy: "Nature Guide",
      institutionCode: "DEMO",
      basisOfRecord: "HUMAN_OBSERVATION",
    },
    {
      id: "5219404_obs_3",
      speciesId: "5219404",
      eventDate: "2022-10-15",
      decimalLatitude: 50.8503,
      decimalLongitude: 20.6531,
      locality: "Świętokrzyskie Mountains, Poland",
      recordedBy: "Wildlife Camera",
      institutionCode: "DEMO",
      basisOfRecord: "MACHINE_OBSERVATION",
    },
    {
      id: "5219404_obs_4",
      speciesId: "5219404",
      eventDate: "2022-06-22",
      decimalLatitude: 53.1325,
      decimalLongitude: 23.1688,
      locality: "Białowieża Forest, Podlaskie, Poland",
      recordedBy: "Park Ranger",
      institutionCode: "DEMO",
      basisOfRecord: "HUMAN_OBSERVATION",
    },
  ],

  stats: {
    totalSpecies: 28547,
    totalObservations: 1247832,
    kingdoms: 6,
    topKingdoms: [
      { name: "Plantae", count: 15234 },
      { name: "Animalia", count: 12543 },
      { name: "Fungi", count: 567 },
      { name: "Bacteria", count: 203 },
    ],
    lastUpdated: new Date().toISOString(),
    dataSource: "Demo Data - GBIF Structure",
  },
}
