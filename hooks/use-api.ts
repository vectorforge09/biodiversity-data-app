"use client"

import { useState, useEffect, useCallback } from "react"
import { api, mockData } from "@/lib/api"

// Generic hook for API state management
export function useApi<T>(apiCall: () => Promise<T>, dependencies: any[] = [], fallbackData?: T) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUsingMockData, setIsUsingMockData] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setIsUsingMockData(false)

    try {
      const result = await apiCall()
      setData(result)
    } catch (err) {
      console.warn("API call failed, using fallback data:", err)

      if (fallbackData) {
        setData(fallbackData)
        setIsUsingMockData(true)
        setError(null) // Don't show error when we have fallback
      } else {
        setError(err instanceof Error ? err.message : "An error occurred")
      }
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData, isUsingMockData }
}

// Hook for species search with debouncing
export function useSpeciesSearch(query: string, limit = 10) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Mock search function for fallback
  const mockSearch = useCallback(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      return Promise.resolve({ results: [], total: 0, queryTimeMs: 0 })
    }

    const filteredSpecies = mockData.species.filter(
      (species) =>
        species.scientificName.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        (species.vernacularName && species.vernacularName.toLowerCase().includes(debouncedQuery.toLowerCase())),
    )

    return Promise.resolve({
      results: filteredSpecies.slice(0, limit),
      total: filteredSpecies.length,
      queryTimeMs: 50,
    })
  }, [debouncedQuery, limit])

  return useApi(
    () => api.searchSpecies(debouncedQuery, limit),
    [debouncedQuery, limit],
    undefined, // Will use mockSearch result when API fails
  )
}

// Hook for species observations
export function useSpeciesObservations(speciesId: string | null, limit = 300) {
  return useApi(
    () =>
      speciesId
        ? api.getObservations(speciesId, limit)
        : Promise.resolve({ observations: [], total: 0, queryTimeMs: 0 }),
    [speciesId, limit],
    { observations: [], total: 0, queryTimeMs: 0 }, // Simple fallback for empty state
  )
}

// Hook for biodiversity statistics
export function useBiodiversityStats() {
  return useApi(() => api.getStats(), [], mockData.stats)
}

// Hook for API health status
export function useApiHealth() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkHealth = useCallback(async () => {
    try {
      await api.healthCheck()
      setIsOnline(true)
      setLastChecked(new Date())
    } catch (error) {
      setIsOnline(false)
      setLastChecked(new Date())
    }
  }, [])

  useEffect(() => {
    // Initial check
    checkHealth()

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000)

    return () => clearInterval(interval)
  }, [checkHealth])

  return { isOnline, lastChecked, checkHealth }
}
