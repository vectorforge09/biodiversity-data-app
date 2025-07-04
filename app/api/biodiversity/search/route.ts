import { type NextRequest, NextResponse } from "next/server"
import type { Species } from "@/types/biodiversity"

// GBIF API base URL
const GBIF_API_BASE = "https://api.gbif.org/v1"

// Cache for species search results (in production, use Redis or similar)
const searchCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface GBIFSpecies {
  key: number
  scientificName: string
  canonicalName: string
  vernacularNames?: Array<{
    vernacularName: string
    language: string
  }>
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  rank: string
}

function transformGBIFSpecies(gbifSpecies: GBIFSpecies): Species {
  // Get English vernacular name if available
  const englishVernacular = gbifSpecies.vernacularNames?.find(
    (vn) => vn.language === "en" || vn.language === "eng",
  )?.vernacularName

  return {
    id: gbifSpecies.key.toString(),
    scientificName: gbifSpecies.scientificName || gbifSpecies.canonicalName,
    vernacularName: englishVernacular,
    kingdom: gbifSpecies.kingdom || "Unknown",
    phylum: gbifSpecies.phylum,
    class: gbifSpecies.class,
    order: gbifSpecies.order,
    family: gbifSpecies.family,
    genus: gbifSpecies.genus,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim() || ""

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], total: 0 })
  }

  // Check cache first
  const cacheKey = `search:${query.toLowerCase()}`
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data)
  }

  try {
    // Search GBIF species API with focus on Poland (country code: PL)
    const searchUrl = new URL(`${GBIF_API_BASE}/species/search`)
    searchUrl.searchParams.set("q", query)
    searchUrl.searchParams.set("limit", "15")
    searchUrl.searchParams.set("offset", "0")
    searchUrl.searchParams.set("rank", "SPECIES")
    searchUrl.searchParams.set("status", "ACCEPTED")

    console.log("Searching GBIF API:", searchUrl.toString())

    const response = await fetch(searchUrl.toString(), {
      headers: {
        "User-Agent": "BioDiversityExplorer/1.0 (https://biodiversity-explorer.vercel.app)",
      },
    })

    if (!response.ok) {
      throw new Error(`GBIF API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform GBIF results to our format
    const transformedResults = data.results
      .filter((species: GBIFSpecies) => species.rank === "SPECIES")
      .map(transformGBIFSpecies)
      .slice(0, 10) // Limit to 10 results for UI

    const result = {
      results: transformedResults,
      total: Math.min(data.count || 0, 10),
    }

    // Cache the result
    searchCache.set(cacheKey, { data: result, timestamp: Date.now() })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error searching GBIF API:", error)

    // Return error response
    return NextResponse.json(
      {
        error: "Failed to search species data",
        details: error instanceof Error ? error.message : "Unknown error",
        results: [],
        total: 0,
      },
      { status: 500 },
    )
  }
}
