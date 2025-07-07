"use client"

import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"

// Generic hook for API state management
export function useApi<T>(apiCall: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await apiCall()
      setData(result)
    } catch (err) {
      console.error("API call failed:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// Hook for species search with debouncing and vernacular names
export function useSpeciesSearch(query: string, limit = 10) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  return useApi(() => api.searchSpecies(debouncedQuery, limit), [debouncedQuery, limit])
}

// Hook for species observations
export function useSpeciesObservations(speciesId: string | null, limit = 300) {
  return useApi(
    () =>
      speciesId
        ? api.getObservations(speciesId, limit)
        : Promise.resolve({ observations: [], total: 0, queryTimeMs: 0 }),
    [speciesId, limit],
  )
}

// Hook for GBIF density map tiles
export function useSpeciesMapTiles(speciesId: string | null) {
  return useApi(
    () =>
      speciesId
        ? api.getMapTiles(speciesId)
        : Promise.resolve({ speciesKey: "", densityMapUrl: "", tileTemplate: "", attribution: "" }),
    [speciesId],
  )
}

// Hook for biodiversity statistics
export function useBiodiversityStats() {
  return useApi(() => api.getStats(), [])
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
