import { type NextRequest, NextResponse } from "next/server"
import type { Observation } from "@/types/biodiversity"

// GBIF API base URL
const GBIF_API_BASE = "https://api.gbif.org/v1"

// Cache for observation data
const observationCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

interface GBIFOccurrence {
  key: number
  speciesKey?: number
  taxonKey?: number
  eventDate?: string
  decimalLatitude?: number
  decimalLongitude?: number
  locality?: string
  recordedBy?: string
  institutionCode?: string
  basisOfRecord?: string
  country?: string
  stateProvince?: string
  municipality?: string
  year?: number
  month?: number
  day?: number
}

function transformGBIFOccurrence(gbifOccurrence: GBIFOccurrence, speciesId: string): Observation {
  // Construct event date from year/month/day if eventDate is not available
  let eventDate = gbifOccurrence.eventDate
  if (!eventDate && gbifOccurrence.year) {
    const month = gbifOccurrence.month || 1
    const day = gbifOccurrence.day || 1
    eventDate = `${gbifOccurrence.year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
  }

  return {
    id: gbifOccurrence.key.toString(),
    speciesId: speciesId,
    eventDate: eventDate || new Date().toISOString().split("T")[0],
    decimalLatitude: gbifOccurrence.decimalLatitude,
    decimalLongitude: gbifOccurrence.decimalLongitude,
    locality:
      gbifOccurrence.locality ||
      [gbifOccurrence.municipality, gbifOccurrence.stateProvince, gbifOccurrence.country].filter(Boolean).join(", ") ||
      undefined,
    recordedBy: gbifOccurrence.recordedBy,
    institutionCode: gbifOccurrence.institutionCode,
    basisOfRecord: gbifOccurrence.basisOfRecord || "UNKNOWN",
  }
}

export async function GET(request: NextRequest, { params }: { params: { speciesId: string } }) {
  const speciesId = params.speciesId

  if (!speciesId) {
    return NextResponse.json({ error: "Species ID is required" }, { status: 400 })
  }

  // Check cache first
  const cacheKey = `observations:${speciesId}`
  const cached = observationCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data)
  }

  try {
    // Fetch occurrences from GBIF API for Poland (country code: PL)
    const occurrenceUrl = new URL(`${GBIF_API_BASE}/occurrence/search`)
    occurrenceUrl.searchParams.set("taxonKey", speciesId)
    occurrenceUrl.searchParams.set("country", "PL") // Poland
    occurrenceUrl.searchParams.set("hasCoordinate", "true") // Only georeferenced records
    occurrenceUrl.searchParams.set("hasGeospatialIssue", "false") // Exclude problematic coordinates
    occurrenceUrl.searchParams.set("limit", "300") // Get more records for better visualization
    occurrenceUrl.searchParams.set("offset", "0")

    console.log("Fetching GBIF occurrences:", occurrenceUrl.toString())

    const response = await fetch(occurrenceUrl.toString(), {
      headers: {
        "User-Agent": "BioDiversityExplorer/1.0 (https://biodiversity-explorer.vercel.app)",
      },
    })

    if (!response.ok) {
      throw new Error(`GBIF API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform GBIF occurrences to our format
    const transformedObservations = data.results
      .filter(
        (occ: GBIFOccurrence) =>
          occ.decimalLatitude &&
          occ.decimalLongitude &&
          occ.decimalLatitude >= 49 &&
          occ.decimalLatitude <= 54.5 && // Poland latitude bounds
          occ.decimalLongitude >= 14.1 &&
          occ.decimalLongitude <= 24.1, // Poland longitude bounds
      )
      .map((occ: GBIFOccurrence) => transformGBIFOccurrence(occ, speciesId))
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())

    const result = {
      observations: transformedObservations,
      total: transformedObservations.length,
      gbifTotal: data.count || 0,
    }

    // Cache the result
    observationCache.set(cacheKey, { data: result, timestamp: Date.now() })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching GBIF occurrences:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch observation data",
        details: error instanceof Error ? error.message : "Unknown error",
        observations: [],
        total: 0,
      },
      { status: 500 },
    )
  }
}
