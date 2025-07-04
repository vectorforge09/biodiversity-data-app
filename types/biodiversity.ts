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
  species?: string
  taxonomicStatus?: string
  rank?: string
  vernacularNames?: Array<{
    vernacularName: string
    language: string
  }>
}

export interface Observation {
  id: string
  speciesId: string
  eventDate: string
  decimalLatitude?: number
  decimalLongitude?: number
  locality?: string
  recordedBy?: string
  institutionCode?: string
  basisOfRecord: string
}

export interface SearchResponse {
  results: Species[]
  total: number
  error?: string
  details?: string
}

export interface ObservationResponse {
  observations: Observation[]
  total: number
  gbifTotal?: number
  error?: string
  details?: string
}

export interface StatsResponse {
  totalSpecies: number
  totalObservations: number
  kingdoms: number
  topKingdoms: Array<{
    name: string
    count: number
  }>
  lastUpdated: string
  dataSource: string
  error?: string
}
