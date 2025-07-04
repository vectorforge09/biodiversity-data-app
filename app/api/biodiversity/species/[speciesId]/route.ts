import { type NextRequest, NextResponse } from "next/server"

// GBIF API base URL
const GBIF_API_BASE = "https://api.gbif.org/v1"

// Cache for species details
const speciesCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

export async function GET(request: NextRequest, { params }: { params: { speciesId: string } }) {
  const speciesId = params.speciesId

  if (!speciesId) {
    return NextResponse.json({ error: "Species ID is required" }, { status: 400 })
  }

  // Check cache first
  const cacheKey = `species:${speciesId}`
  const cached = speciesCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data)
  }

  try {
    // Fetch species details from GBIF API
    const [speciesResponse, vernacularResponse] = await Promise.all([
      fetch(`${GBIF_API_BASE}/species/${speciesId}`, {
        headers: {
          "User-Agent": "BioDiversityExplorer/1.0 (https://biodiversity-explorer.vercel.app)",
        },
      }),
      fetch(`${GBIF_API_BASE}/species/${speciesId}/vernacularNames?limit=10`, {
        headers: {
          "User-Agent": "BioDiversityExplorer/1.0 (https://biodiversity-explorer.vercel.app)",
        },
      }),
    ])

    if (!speciesResponse.ok) {
      throw new Error(`GBIF API error: ${speciesResponse.status}`)
    }

    const speciesData = await speciesResponse.json()
    const vernacularData = vernacularResponse.ok ? await vernacularResponse.json() : { results: [] }

    // Get English vernacular name
    const englishVernacular = vernacularData.results?.find(
      (vn: any) => vn.language === "en" || vn.language === "eng",
    )?.vernacularName

    const result = {
      id: speciesData.key.toString(),
      scientificName: speciesData.scientificName || speciesData.canonicalName,
      vernacularName: englishVernacular,
      kingdom: speciesData.kingdom,
      phylum: speciesData.phylum,
      class: speciesData.class,
      order: speciesData.order,
      family: speciesData.family,
      genus: speciesData.genus,
      species: speciesData.species,
      taxonomicStatus: speciesData.taxonomicStatus,
      rank: speciesData.rank,
      vernacularNames: vernacularData.results?.slice(0, 5) || [],
    }

    // Cache the result
    speciesCache.set(cacheKey, { data: result, timestamp: Date.now() })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching species details:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch species details",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
