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
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

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
        throw new ApiError("Request timeout - FastAPI backend may be unavailable")
      }

      // Network error - retry if not the last attempt
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
        continue
      }
    }
  }

  throw new ApiError("Network error - FastAPI backend unavailable", 0, lastError)
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
