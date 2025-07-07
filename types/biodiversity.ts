// Type definitions for biodiversity data structures

export interface Species {
  id: string
  scientificName: string
  canonicalName?: string
  vernacularName?: string
  kingdom: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  species?: string
  rank?: string
  taxonomicStatus?: string
  // Geographic preview data
  observationCount?: number
  sampleLatitude?: number
  sampleLongitude?: number
}

export interface Observation {
  id: string
  speciesId: string
  eventDate: string
  decimalLatitude: number
  decimalLongitude: number
  locality?: string
  municipality?: string
  stateProvince?: string
  country?: string
  recordedBy?: string
  institutionCode?: string
  basisOfRecord?: string
  year?: number
  month?: number
  coordinateUncertaintyInMeters?: number
}

export interface SearchResponse {
  results: Species[]
  total: number
  queryTimeMs: number
}

export interface ObservationsResponse {
  observations: Observation[]
  total: number
  gbifTotal: number
  queryTimeMs: number
}

export interface KingdomStats {
  name: string
  count: number
  percentage: number
}

export interface StatsResponse {
  totalSpecies: number
  totalObservations: number
  kingdoms: number
  topKingdoms: KingdomStats[]
  lastUpdated: string
  dataSource?: string
  queryTimeMs: number
}

export interface HealthResponse {
  status: string
  timestamp: string
  version?: string
}
