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

// Update the useSpeciesObservations hook to handle fallback data properly
export function useSpeciesObservations(speciesId: string | null, limit = 300) {
  const [fallbackData, setFallbackData] = useState<any>(null)

  // Generate fallback observations for the selected species
  useEffect(() => {
    if (speciesId) {
      const speciesObservations = mockData.observations.filter((obs) => obs.speciesId === speciesId)

      // If no mock data for this species, generate some sample data
      if (speciesObservations.length === 0) {
        const sampleObservations = [
          {
            id: `${speciesId}_obs_1`,
            speciesId: speciesId,
            eventDate: "2023-06-15",
            decimalLatitude: 52.2297,
            decimalLongitude: 21.0122,
            locality: "Warsaw, Mazowieckie, Poland",
            recordedBy: "Demo Observer",
            institutionCode: "DEMO",
            basisOfRecord: "HUMAN_OBSERVATION",
          },
          {
            id: `${speciesId}_obs_2`,
            speciesId: speciesId,
            eventDate: "2023-07-20",
            decimalLatitude: 50.0647,
            decimalLongitude: 19.945,
            locality: "Kraków, Małopolskie, Poland",
            recordedBy: "Demo Observer",
            institutionCode: "DEMO",
            basisOfRecord: "HUMAN_OBSERVATION",
          },
          {
            id: `${speciesId}_obs_3`,
            speciesId: speciesId,
            eventDate: "2022-08-10",
            decimalLatitude: 53.4285,
            decimalLongitude: 14.5528,
            locality: "Szczecin, Zachodniopomorskie, Poland",
            recordedBy: "Demo Observer",
            institutionCode: "DEMO",
            basisOfRecord: "HUMAN_OBSERVATION",
          },
          {
            id: `${speciesId}_obs_4`,
            speciesId: speciesId,
            eventDate: "2022-05-12",
            decimalLatitude: 49.2992,
            decimalLongitude: 19.9496,
            locality: "Zakopane, Małopolskie, Poland",
            recordedBy: "Demo Observer",
            institutionCode: "DEMO",
            basisOfRecord: "HUMAN_OBSERVATION",
          },
          {
            id: `${speciesId}_obs_5`,
            speciesId: speciesId,
            eventDate: "2021-09-03",
            decimalLatitude: 51.7592,
            decimalLongitude: 19.456,
            locality: "Łódź, Łódzkie, Poland",
            recordedBy: "Demo Observer",
            institutionCode: "DEMO",
            basisOfRecord: "HUMAN_OBSERVATION",
          },
        ]

        setFallbackData({
          observations: sampleObservations,
          total: sampleObservations.length,
          gbifTotal: sampleObservations.length,
          queryTimeMs: 100,
        })
      } else {
        setFallbackData({
          observations: speciesObservations,
          total: speciesObservations.length,
          gbifTotal: speciesObservations.length,
          queryTimeMs: 100,
        })
      }
    } else {
      setFallbackData({ observations: [], total: 0, queryTimeMs: 0 })
    }
  }, [speciesId])

  return useApi(
    () =>
      speciesId
        ? api.getObservations(speciesId, limit)
        : Promise.resolve({ observations: [], total: 0, queryTimeMs: 0 }),
    [speciesId, limit],
    fallbackData,
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
