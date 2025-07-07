"use client"

import { useState } from "react"
import { Search, MapPin, BarChart3, Leaf, AlertCircle, Globe, Calendar, Wifi, WifiOff } from "lucide-react"
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
import { useSpeciesSearch, useSpeciesObservations, useBiodiversityStats, useApiHealth } from "@/hooks/use-api"
import type { Species } from "@/types/biodiversity"

export default function BiodiversityDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)
  const [showResults, setShowResults] = useState(false)

  // API hooks - all connected to FastAPI backend
  const { data: searchResults, loading: searchLoading, error: searchError } = useSpeciesSearch(searchQuery)
  const {
    data: observations,
    loading: observationsLoading,
    error: observationsError,
  } = useSpeciesObservations(selectedSpecies?.id || null)
  const { data: stats, loading: statsLoading, error: statsError } = useBiodiversityStats()
  const { isOnline } = useApiHealth()

  // Handle search input with debouncing
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setShowResults(value.length >= 2)
    if (value.length < 2) {
      setSelectedSpecies(null)
    }
  }

  // Handle species selection from search results
  const handleSpeciesSelect = (species: Species) => {
    setSelectedSpecies(species)
    setShowResults(false)
    setSearchQuery(species.scientificName)
  }

  // Clear selection and return to dashboard
  const clearSelection = () => {
    setSelectedSpecies(null)
    setSearchQuery("")
    setShowResults(false)
  }

  // Show backend offline message when API is not available
  if (isOnline === false) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-red-100 rounded-full w-fit">
                <WifiOff className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-900">Backend Unavailable</CardTitle>
              <CardDescription className="text-lg">
                Cannot connect to the FastAPI backend that provides GBIF data access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Required:</strong> Start the FastAPI backend server to access GBIF biodiversity data.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">To start the backend:</h3>
                <code className="block bg-gray-800 text-green-400 p-3 rounded text-sm">
                  cd backend
                  <br />
                  uvicorn main:app --reload --port 8000
                </code>
              </div>

              <div className="text-center">
                <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
                  <Wifi className="h-4 w-4 mr-2" />
                  Check Connection Again
                </Button>
              </div>

              <div className="text-sm text-gray-600 text-center">
                <p>Expected backend URL: {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}</p>
                <p>This application requires real-time access to GBIF data through the FastAPI backend.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-emerald-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-2 rounded-lg shadow-sm">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Poland Biodiversity Explorer</h1>
                  <p className="text-sm text-gray-600">Real-time GBIF data visualization</p>
                </div>
              </div>
              <ApiStatus />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Section */}
          <div className="mb-8">
            <div className="relative max-w-3xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search species by scientific name (e.g., Pinus sylvestris) or common name (e.g., Pine)..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-12 pr-4 py-4 text-lg border-2 border-gray-200 focus:border-green-500 rounded-xl shadow-sm"
                />
                {selectedSpecies && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Search Results Dropdown */}
            {showResults && (
              <div className="max-w-3xl mx-auto mt-4">
                <Card className="shadow-lg border-2">
                  <CardContent className="p-0">
                    {searchLoading ? (
                      <div className="p-4 space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center space-x-3">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2 flex-1">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : searchError ? (
                      <div className="p-6 text-center text-red-500">
                        <AlertCircle className="h-12 w-12 mx-auto mb-3" />
                        <p className="text-lg font-medium">Search Error</p>
                        <p className="text-sm">{searchError}</p>
                      </div>
                    ) : searchResults?.results && searchResults.results.length > 0 ? (
                      <div className="max-h-96 overflow-y-auto">
                        {searchResults.results.map((species, index) => (
                          <button
                            key={species.id}
                            onClick={() => handleSpeciesSelect(species)}
                            className={`w-full p-4 text-left hover:bg-green-50 transition-colors ${
                              index !== searchResults.results.length - 1 ? "border-b" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <Leaf className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-gray-900 text-lg">{species.scientificName}</h3>
                                    {species.canonicalName && species.canonicalName !== species.scientificName && (
                                      <p className="text-sm text-gray-500 font-mono">{species.canonicalName}</p>
                                    )}
                                    {species.vernacularName && (
                                      <p className="text-sm text-gray-600 font-medium">{species.vernacularName}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="default" className="text-xs">
                                        {species.kingdom}
                                      </Badge>
                                      {species.family && (
                                        <Badge variant="outline" className="text-xs">
                                          {species.family}
                                        </Badge>
                                      )}
                                      {species.rank && (
                                        <Badge variant="secondary" className="text-xs">
                                          {species.rank}
                                        </Badge>
                                      )}
                                      {species.observationCount !== undefined && species.observationCount > 0 && (
                                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                          {species.observationCount.toLocaleString()} observations
                                        </Badge>
                                      )}
                                    </div>
                                    {/* Show sample coordinates if available */}
                                    {species.sampleLatitude && species.sampleLongitude && (
                                      <div className="text-xs text-gray-500 mt-1 font-mono">
                                        📍 {species.sampleLatitude.toFixed(4)}°N, {species.sampleLongitude.toFixed(4)}°E
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : searchQuery.length >= 2 ? (
                      <div className="p-6 text-center text-gray-500">
                        <Globe className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">No species found</p>
                        <p className="text-sm">Try searching for "{searchQuery}" with different spelling</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Main Content */}
          {selectedSpecies ? (
            /* Species Analysis View */
            <div className="space-y-8">
              {/* Species Information Header */}
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                        <Leaf className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-3xl text-gray-900 mb-2">{selectedSpecies.scientificName}</CardTitle>
                        {selectedSpecies.canonicalName &&
                          selectedSpecies.canonicalName !== selectedSpecies.scientificName && (
                            <CardDescription className="text-lg text-gray-600 font-mono mb-2">
                              {selectedSpecies.canonicalName}
                            </CardDescription>
                          )}
                        {selectedSpecies.vernacularName && (
                          <CardDescription className="text-xl text-gray-700 font-medium mb-3">
                            {selectedSpecies.vernacularName}
                          </CardDescription>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="default" className="bg-green-600">
                            {selectedSpecies.kingdom}
                          </Badge>
                          {selectedSpecies.phylum && <Badge variant="secondary">{selectedSpecies.phylum}</Badge>}
                          {selectedSpecies.class && <Badge variant="secondary">{selectedSpecies.class}</Badge>}
                          {selectedSpecies.order && <Badge variant="outline">{selectedSpecies.order}</Badge>}
                          {selectedSpecies.family && <Badge variant="outline">{selectedSpecies.family}</Badge>}
                          {selectedSpecies.rank && <Badge variant="outline">{selectedSpecies.rank}</Badge>}
                          {selectedSpecies.taxonomicStatus && (
                            <Badge variant={selectedSpecies.taxonomicStatus === "ACCEPTED" ? "default" : "secondary"}>
                              {selectedSpecies.taxonomicStatus}
                            </Badge>
                          )}
                        </div>
                        {/* Show coordinate preview */}
                        {selectedSpecies.sampleLatitude && selectedSpecies.sampleLongitude && (
                          <div className="text-sm text-gray-600">
                            📍 Sample location: {selectedSpecies.sampleLatitude.toFixed(4)}°N,{" "}
                            {selectedSpecies.sampleLongitude.toFixed(4)}°E
                            {selectedSpecies.observationCount && (
                              <span className="ml-2">
                                • {selectedSpecies.observationCount.toLocaleString()} total observations in Poland
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" onClick={clearSelection} className="shrink-0 bg-transparent">
                      Back to Dashboard
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Observation Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Observations</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {observationsLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : observationsError ? (
                        <span className="text-red-500 text-sm">Error</span>
                      ) : (
                        observations?.total?.toLocaleString() || "0"
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Records in Poland</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">GBIF Records</CardTitle>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {observationsLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : observationsError ? (
                        <span className="text-red-500 text-sm">Error</span>
                      ) : (
                        observations?.gbifTotal?.toLocaleString() || "0"
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Total GBIF database</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Query Time</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {observationsLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : observationsError ? (
                        <span className="text-red-500 text-sm">Error</span>
                      ) : (
                        `${observations?.queryTimeMs || 0}ms`
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Response time</p>
                  </CardContent>
                </Card>
              </div>

              {/* Main Visualizations */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Geographic Distribution Map */}
                <Card className="xl:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <MapPin className="h-6 w-6 text-green-600" />
                      Geographic Distribution
                    </CardTitle>
                    <CardDescription className="text-base">
                      GBIF observation locations across Poland
                      {observations && observations.total > 0 && (
                        <span className="font-medium text-green-600 ml-2">• {observations.total} locations mapped</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {observationsLoading ? (
                      <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                          <div className="text-lg font-medium text-gray-600">Loading distribution map...</div>
                          <div className="text-sm text-gray-500">Fetching observation coordinates from GBIF</div>
                        </div>
                      </div>
                    ) : observationsError ? (
                      <div className="h-96 bg-red-50 rounded-lg flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                          <div className="text-lg font-medium text-red-700">Failed to load observations</div>
                          <div className="text-sm text-red-600">{observationsError}</div>
                        </div>
                      </div>
                    ) : (
                      <SpeciesMap observations={observations?.observations || []} />
                    )}
                  </CardContent>
                </Card>

                {/* Observation Timeline */}
                <Card className="xl:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Calendar className="h-6 w-6 text-blue-600" />
                      Observation Timeline
                    </CardTitle>
                    <CardDescription className="text-base">
                      Frequency of observations over time
                      {observationsLoading && <span className="text-blue-600 ml-2">• Loading temporal data...</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {observationsLoading ? (
                      <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                          <div className="text-lg font-medium text-gray-600">Loading timeline data...</div>
                          <div className="text-sm text-gray-500">Processing observation dates from GBIF</div>
                        </div>
                      </div>
                    ) : observationsError ? (
                      <div className="h-96 bg-red-50 rounded-lg flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                          <div className="text-lg font-medium text-red-700">Failed to load timeline</div>
                          <div className="text-sm text-red-600">{observationsError}</div>
                        </div>
                      </div>
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
              {/* Welcome Section */}
              <Card className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
                <CardHeader className="text-center py-12">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Globe className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-4xl mb-4">Explore Poland's Biodiversity</CardTitle>
                  <CardDescription className="text-xl text-green-100 max-w-2xl mx-auto">
                    Real-time species observations from the Global Biodiversity Information Facility (GBIF). Search for
                    any species to see where and when it has been observed across Poland.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Statistics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Species Recorded</CardTitle>
                    <Leaf className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {statsLoading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : statsError ? (
                        <span className="text-red-500 text-sm">Error</span>
                      ) : (
                        stats?.totalSpecies?.toLocaleString() || "0"
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Unique species in Poland</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Observations</CardTitle>
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {statsLoading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : statsError ? (
                        <span className="text-red-500 text-sm">Error</span>
                      ) : (
                        stats?.totalObservations?.toLocaleString() || "0"
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Geographic records</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxonomic Kingdoms</CardTitle>
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">
                      {statsLoading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : statsError ? (
                        <span className="text-red-500 text-sm">Error</span>
                      ) : (
                        stats?.kingdoms || "0"
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Major life groups</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Data Source</CardTitle>
                    <Globe className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-orange-600">GBIF</div>
                    <p className="text-xs text-muted-foreground mt-1">Global Biodiversity Information Facility</p>
                  </CardContent>
                </Card>
              </div>

              {/* Featured Species Examples */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Featured Polish Species</CardTitle>
                  <CardDescription className="text-base">
                    Click on any species below to explore its real-time GBIF distribution and observation timeline
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      {
                        name: "Pinus sylvestris",
                        common: "Scots Pine",
                        icon: "🌲",
                        description: "Poland's national tree, widespread in forests",
                        kingdom: "Plantae",
                      },
                      {
                        name: "Quercus robur",
                        common: "English Oak",
                        icon: "🌳",
                        description: "Majestic oak tree, symbol of strength",
                        kingdom: "Plantae",
                      },
                      {
                        name: "Cervus elaphus",
                        common: "Red Deer",
                        icon: "🦌",
                        description: "Large deer species found in Polish forests",
                        kingdom: "Animalia",
                      },
                      {
                        name: "Lynx lynx",
                        common: "Eurasian Lynx",
                        icon: "🐱",
                        description: "Wild cat species returning to Polish wilderness",
                        kingdom: "Animalia",
                      },
                      {
                        name: "Aquila chrysaetos",
                        common: "Golden Eagle",
                        icon: "🦅",
                        description: "Magnificent bird of prey in mountain regions",
                        kingdom: "Animalia",
                      },
                      {
                        name: "Fagus sylvatica",
                        common: "European Beech",
                        icon: "🍃",
                        description: "Deciduous tree forming beautiful forests",
                        kingdom: "Plantae",
                      },
                    ].map((species) => (
                      <button
                        key={species.name}
                        onClick={() => handleSearch(species.name)}
                        className="p-6 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all text-left group"
                      >
                        <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{species.icon}</div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{species.name}</h3>
                        <p className="font-medium text-green-600 mb-2">{species.common}</p>
                        <p className="text-sm text-gray-600 mb-3">{species.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {species.kingdom}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Biodiversity by Kingdom */}
              {stats?.topKingdoms && !statsError && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">Biodiversity Overview</CardTitle>
                    <CardDescription className="text-base">
                      Live distribution of recorded species across major taxonomic kingdoms in Poland (from GBIF)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {stats.topKingdoms.map((kingdom, index) => (
                        <div key={kingdom.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                index === 0
                                  ? "bg-green-100 text-green-600"
                                  : index === 1
                                    ? "bg-blue-100 text-blue-600"
                                    : index === 2
                                      ? "bg-purple-100 text-purple-600"
                                      : "bg-orange-100 text-orange-600"
                              }`}
                            >
                              {index === 0 ? "🌱" : index === 1 ? "🦋" : index === 2 ? "🍄" : "🦠"}
                            </div>
                            <div>
                              <Badge variant="outline" className="mb-2">
                                {kingdom.name}
                              </Badge>
                              <p className="text-sm text-gray-600">
                                {kingdom.name === "Plantae"
                                  ? "Plants, trees, and vegetation"
                                  : kingdom.name === "Animalia"
                                    ? "Animals, birds, and wildlife"
                                    : kingdom.name === "Fungi"
                                      ? "Mushrooms and fungi"
                                      : "Microorganisms and bacteria"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">{kingdom.count.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">species</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* How to Use */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-2xl text-blue-900">How to Use This Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="font-bold text-lg text-blue-900 mb-2">1. Search Species</h3>
                      <p className="text-blue-700">
                        Search by scientific name (e.g., "Pinus sylvestris") or common name (e.g., "Pine") to find real
                        GBIF data with coordinates
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="font-bold text-lg text-blue-900 mb-2">2. View Distribution</h3>
                      <p className="text-blue-700">
                        See live GBIF observation locations across Poland with precise latitude/longitude coordinates
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="font-bold text-lg text-blue-900 mb-2">3. Analyze Timeline</h3>
                      <p className="text-blue-700">
                        Explore real observation dates from GBIF to understand seasonal patterns and research activity
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  )
}
