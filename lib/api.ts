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

    // Network or other errors
    throw new ApiError("Network error or server unavailable", 0, { originalError: error })
  }
}

// API functions for biodiversity data
export const biodiversityApi = {
  // Search for species
  searchSpecies: async (query: string, limit = 10) => {
    return apiRequest(`/api/v1/species/search?q=${encodeURIComponent(query)}&limit=${limit}`)
  },

  // Get species details by ID
  getSpecies: async (speciesId: string) => {
    return apiRequest(`/api/v1/species/${speciesId}`)
  },

  // Get observations for a species
  getObservations: async (speciesId: string, limit = 300) => {
    return apiRequest(`/api/v1/species/${speciesId}/observations?limit=${limit}`)
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

// Utility function to check if backend is available
export async function checkBackendHealth(): Promise<boolean> {
  try {
    await biodiversityApi.healthCheck()
    return true
  } catch {
    return false
  }
}
