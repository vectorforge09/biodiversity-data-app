// API configuration and utilities for connecting to FastAPI backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// Generic API request handler with error handling and retries
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(10000), // 10 second timeout
    ...options,
  }

  try {
    const response = await fetch(url, defaultOptions)

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
    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new ApiError(
        "Backend server is not available. Please check if the FastAPI server is running on " + API_BASE_URL,
        0,
        { originalError: error },
      )
    }

    if (error.name === "AbortError") {
      throw new ApiError("Request timeout - server took too long to respond", 408, { originalError: error })
    }

    // Network or other errors
    throw new ApiError("Network error or server unavailable", 0, { originalError: error })
  }
}

// Mock data for fallback when backend is unavailable
const mockSpeciesData = [
  {
    id: "2684876",
    scientificName: "Pinus sylvestris",
    vernacularName: "Scots Pine",
    kingdom: "Plantae",
    family: "Pinaceae",
    genus: "Pinus",
  },
  {
    id: "5219404",
    scientificName: "Cervus elaphus",
    vernacularName: "Red Deer",
    kingdom: "Animalia",
    family: "Cervidae",
    genus: "Cervus",
  },
  {
    id: "2878688",
    scientificName: "Quercus robur",
    vernacularName: "English Oak",
    kingdom: "Plantae",
    family: "Fagaceae",
    genus: "Quercus",
  },
]

const mockObservationsData = [
  {
    id: "1",
    speciesId: "2684876",
    eventDate: "2023-06-15",
    decimalLatitude: 52.2297,
    decimalLongitude: 21.0122,
    locality: "Warsaw, Poland",
    recordedBy: "Citizen Scientist",
    institutionCode: "GBIF",
    basisOfRecord: "HUMAN_OBSERVATION",
  },
  {
    id: "2",
    speciesId: "2684876",
    eventDate: "2023-07-20",
    decimalLatitude: 50.0647,
    decimalLongitude: 19.945,
    locality: "Krakow, Poland",
    recordedBy: "Research Team",
    institutionCode: "GBIF",
    basisOfRecord: "HUMAN_OBSERVATION",
  },
]

const mockStatsData = {
  totalSpecies: 28547,
  totalObservations: 1247832,
  kingdoms: 6,
  topKingdoms: [
    { name: "Plantae", count: 12543 },
    { name: "Animalia", count: 15234 },
    { name: "Fungi", count: 567 },
    { name: "Bacteria", count: 203 },
  ],
  lastUpdated: new Date().toISOString(),
  dataSource: "Mock Data (Backend Unavailable)",
}

// API functions for biodiversity data with fallback
export const biodiversityApi = {
  // Search for species
  searchSpecies: async (query: string, limit = 10) => {
    try {
      return await apiRequest(`/api/v1/species/search?q=${encodeURIComponent(query)}&limit=${limit}`)
    } catch (error) {
      console.warn("Backend unavailable, using mock data for species search")
      const filteredResults = mockSpeciesData.filter(
        (species) =>
          species.scientificName.toLowerCase().includes(query.toLowerCase()) ||
          (species.vernacularName && species.vernacularName.toLowerCase().includes(query.toLowerCase())),
      )
      return {
        results: filteredResults.slice(0, limit),
        total: filteredResults.length,
        queryTimeMs: 50,
      }
    }
  },

  // Get species details by ID
  getSpecies: async (speciesId: string) => {
    try {
      return await apiRequest(`/api/v1/species/${speciesId}`)
    } catch (error) {
      console.warn("Backend unavailable, using mock data for species details")
      const species = mockSpeciesData.find((s) => s.id === speciesId)
      if (!species) {
        throw new ApiError("Species not found", 404)
      }
      return species
    }
  },

  // Get observations for a species
  getObservations: async (speciesId: string, limit = 300) => {
    try {
      return await apiRequest(`/api/v1/species/${speciesId}/observations?limit=${limit}`)
    } catch (error) {
      console.warn("Backend unavailable, using mock data for observations")
      const observations = mockObservationsData.filter((obs) => obs.speciesId === speciesId)
      return {
        observations: observations.slice(0, limit),
        total: observations.length,
        gbifTotal: observations.length,
        queryTimeMs: 75,
      }
    }
  },

  // Get biodiversity statistics
  getStats: async () => {
    try {
      return await apiRequest("/api/v1/stats")
    } catch (error) {
      console.warn("Backend unavailable, using mock data for statistics")
      return mockStatsData
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      return await apiRequest("/health")
    } catch (error) {
      throw new ApiError("Backend health check failed", 503, { originalError: error })
    }
  },
}

// Utility function to check if backend is available
export async function checkBackendHealth(): Promise<boolean> {
  try {
    await biodiversityApi.healthCheck()
    return true
  } catch {
    return false
  }
}
