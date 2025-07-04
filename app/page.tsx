"use client"

import { useState } from "react"
import { Search, MapPin, BarChart3, Leaf, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { SpeciesMap } from "@/components/species-map"
import { ObservationTimeline } from "@/components/observation-timeline"
import { ApiStatus } from "@/components/api-status"
import { ErrorBoundary } from "@/components/error-boundary"
import { useSpeciesSearch, useSpeciesObservations, useBiodiversityStats } from "@/hooks/use-api"
import type { Species } from "@/types/biodiversity"

export default function BiodiversityExplorer() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)
  const [showResults, setShowResults] = useState(false)

  // API hooks
  const {
    data: searchResults,
    loading: searchLoading,
    isUsingMockData: searchUsingMock,
  } = useSpeciesSearch(searchQuery)
  const {
    data: observations,
    loading: observationsLoading,
    isUsingMockData: obsUsingMock,
  } = useSpeciesObservations(selectedSpecies?.id || null)
  const { data: stats, loading: statsLoading, isUsingMockData: statsUsingMock } = useBiodiversityStats()

  const isUsingMockData = searchUsingMock || obsUsingMock || statsUsingMock

  // Handle search input
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setShowResults(value.length >= 2)
    if (value.length < 2) {
      setSelectedSpecies(null)
    }
  }

  // Handle species selection
  const handleSpeciesSelect = (species: Species) => {
    setSelectedSpecies(species)
    setShowResults(false)
    setSearchQuery(species.scientificName)
  }

  // Featured species for default view
  const featuredSpecies = [
    { name: "Pinus sylvestris", common: "Scots Pine", icon: "🌲" },
    { name: "Cervus elaphus", common: "Red Deer", icon: "🦌" },
    { name: "Quercus robur", common: "English Oak", icon: "🌳" },
  ]

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-green-600 p-2 rounded-lg">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">BioDiversity Explorer</h1>
                  <p className="text-sm text-gray-600">Explore Poland's biodiversity with GBIF data</p>
                </div>
              </div>
              <ApiStatus />
            </div>
          </div>
        </header>

        {/* Demo Mode Alert */}
        {isUsingMockData && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Demo Mode:</strong> FastAPI backend is not available. Using sample data for demonstration. Start
                the backend with{" "}
                <code className="bg-amber-100 px-1 rounded">uvicorn main:app --reload --port 8000</code>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Section */}
          <div className="mb-8">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search species by scientific or common name (e.g., Pinus sylvestris, Eagle)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-3 text-lg"
              />
            </div>

            {/* Search Results */}
            {showResults && (
              <div className="max-w-2xl mx-auto mt-4">
                <Card>
                  <CardContent className="p-0">
                    {searchLoading ? (
                      <div className="p-4 space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : searchResults?.results && searchResults.results.length > 0 ? (
                      <div className="max-h-96 overflow-y-auto">
                        {searchResults.results.map((species) => (
                          <button
                            key={species.id}
                            onClick={() => handleSpeciesSelect(species)}
                            className="w-full p-4 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900">{species.scientificName}</h3>
                                {species.vernacularName && (
                                  <p className="text-sm text-gray-600">{species.vernacularName}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {species.kingdom}
                                  </Badge>
                                  {species.family && (
                                    <Badge variant="outline" className="text-xs">
                                      {species.family}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">No species found for "{searchQuery}"</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Main Content */}
          {selectedSpecies ? (
            /* Species Details View */
            <div className="space-y-8">
              {/* Species Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">{selectedSpecies.scientificName}</CardTitle>
                      {selectedSpecies.vernacularName && (
                        <CardDescription className="text-lg mt-1">{selectedSpecies.vernacularName}</CardDescription>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedSpecies(null)
                        setSearchQuery("")
                      }}
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="default">{selectedSpecies.kingdom}</Badge>
                    {selectedSpecies.phylum && <Badge variant="secondary">{selectedSpecies.phylum}</Badge>}
                    {selectedSpecies.class && <Badge variant="secondary">{selectedSpecies.class}</Badge>}
                    {selectedSpecies.order && <Badge variant="outline">{selectedSpecies.order}</Badge>}
                    {selectedSpecies.family && <Badge variant="outline">{selectedSpecies.family}</Badge>}
                  </div>
                </CardHeader>
              </Card>

              {/* Visualizations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Map */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Geographic Distribution
                    </CardTitle>
                    <CardDescription>
                      Observation locations in Poland
                      {observations && ` (${observations.total} records)`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {observationsLoading ? (
                      <Skeleton className="h-96 w-full" />
                    ) : (
                      <SpeciesMap observations={observations?.observations || []} />
                    )}
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Observation Timeline
                    </CardTitle>
                    <CardDescription>Frequency of observations over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {observationsLoading ? (
                      <Skeleton className="h-96 w-full" />
                    ) : (
                      <ObservationTimeline observations={observations?.observations || []} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            /* Default Dashboard View */
            <div className="space-y-8">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Species</CardTitle>
                    <Leaf className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {statsLoading ? <Skeleton className="h-8 w-20" /> : stats?.totalSpecies?.toLocaleString() || "0"}
                    </div>
                    <p className="text-xs text-muted-foreground">Recorded in Poland</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Observations</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {statsLoading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        stats?.totalObservations?.toLocaleString() || "0"
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Geographic records</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Kingdoms</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.kingdoms || "0"}
                    </div>
                    <p className="text-xs text-muted-foreground">Taxonomic kingdoms</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Data Source</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-bold">GBIF</div>
                    <p className="text-xs text-muted-foreground">Global Biodiversity Information Facility</p>
                  </CardContent>
                </Card>
              </div>

              {/* Featured Species */}
              <Card>
                <CardHeader>
                  <CardTitle>Featured Species</CardTitle>
                  <CardDescription>Explore some of Poland's notable species</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {featuredSpecies.map((species) => (
                      <button
                        key={species.name}
                        onClick={() => handleSearch(species.name)}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="text-2xl mb-2">{species.icon}</div>
                        <h3 className="font-semibold">{species.name}</h3>
                        <p className="text-sm text-gray-600">{species.common}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Kingdoms */}
              {stats?.topKingdoms && (
                <Card>
                  <CardHeader>
                    <CardTitle>Biodiversity by Kingdom</CardTitle>
                    <CardDescription>Distribution of species across taxonomic kingdoms</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.topKingdoms.map((kingdom) => (
                        <div key={kingdom.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{kingdom.name}</Badge>
                          </div>
                          <div className="text-sm font-medium">{kingdom.count.toLocaleString()} species</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  )
}
