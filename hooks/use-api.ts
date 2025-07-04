"use client"

import { useState, useEffect, useCallback } from "react"
import { biodiversityApi, ApiError } from "@/lib/api"
import type { Species, Observation, StatsResponse } from "@/types/biodiversity"

// Custom hook for API state management
export function useApi<T>(apiCall: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await apiCall()
      setData(result)
      return result
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError("Unknown error", 0)
      setError(apiError)
      throw apiError
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    execute()
  }, [execute])

  return { data, loading, error, refetch: execute }
}

// Specialized hooks for biodiversity data
export function useSpeciesSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Species[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await biodiversityApi.searchSpecies(searchQuery)
      setResults(response.results || [])
      setQuery(searchQuery)
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError("Search failed", 0)
      setError(apiError)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setQuery("")
    setError(null)
  }, [])

  return {
    query,
    results,
    loading,
    error,
    search,
    clearResults,
  }
}

export function useSpeciesObservations(speciesId: string | null) {
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchObservations = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await biodiversityApi.getObservations(id)
      setObservations(response.observations || [])
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError("Failed to fetch observations", 0)
      setError(apiError)
      setObservations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (speciesId) {
      fetchObservations(speciesId)
    } else {
      setObservations([])
      setError(null)
    }
  }, [speciesId, fetchObservations])

  return { observations, loading, error, refetch: () => speciesId && fetchObservations(speciesId) }
}

export function useBiodiversityStats() {
  return useApi<StatsResponse>(() => biodiversityApi.getStats())
}
