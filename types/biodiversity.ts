// Type definitions for biodiversity data structures

export interface Species {
  id: string
  scientificName: string
  vernacularName?: string
  kingdom: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  rank?: string
  taxonomicStatus?: string
  // New fields for coordinate preview
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
  recordedBy?: string
  institutionCode?: string
  basisOfRecord?: string
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

export interface MapTileInfo {
  speciesKey: string
  densityMapUrl: string
  tileTemplate: string
  attribution: string
}

export interface KingdomStats {
  name: string
  count: number
}

export interface StatsResponse {
  totalSpecies: number
  totalObservations: number
  kingdoms: number
  topKingdoms: KingdomStats[]
  lastUpdated: string
  dataSource?: string
}

export interface HealthResponse {
  status: string
  timestamp: string
  version?: string
}
