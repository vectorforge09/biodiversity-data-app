"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Search, MapPin, Calendar, Leaf } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import SpeciesMap from "@/components/species-map"
import ObservationTimeline from "@/components/observation-timeline"
import type { Species, Observation } from "@/types/biodiversity"
import ApiStatus from "@/components/api-status"

export default function BiodiversityApp() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Species[]>([])
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(false)
  const [defaultStats, setDefaultStats] = useState<any>(null)

  // Load default statistics on component mount
  useEffect(() => {
    fetchDefaultStats()
  }, [])

  const fetchDefaultStats = async () => {
    try {
      const response = await fetch("/api/biodiversity/stats")
      const data = await response.json()
      setDefaultStats(data)
    } catch (error) {
      console.error("Error fetching default stats:", error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/biodiversity/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (data.error) {
        console.error("Search error:", data.error)
        // You could show a toast notification here
      }

      setSearchResults(data.results || [])
    } catch (error) {
      console.error("Error searching species:", error)
      setSearchResults([])
      // You could show a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const handleSpeciesSelect = async (species: Species) => {
    setSelectedSpecies(species)
    setSearchResults([])
    setSearchQuery("")
    setLoading(true)

    try {
      const response = await fetch(`/api/biodiversity/observations/${species.id}`)
      const data = await response.json()

      if (data.error) {
        console.error("Observations error:", data.error)
        // You could show a toast notification here
      }

      setObservations(data.observations || [])
    } catch (error) {
      console.error("Error fetching observations:", error)
      setObservations([])
      // You could show a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
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
                <p className="text-sm text-gray-600">Explore Poland's Rich Biodiversity</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ApiStatus />
              <Badge variant="outline" className="text-green-700 border-green-300">
                Live GBIF Data
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Species Search</span>
            </CardTitle>
            <CardDescription>
              Search for species by their scientific or common names to explore their distribution and observation
              history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter species name (e.g., 'Pinus sylvestris' or 'Scots Pine')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="font-medium text-gray-900">Search Results:</h3>
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {searchResults.map((species) => (
                    <div
                      key={species.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleSpeciesSelect(species)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{species.scientificName}</p>
                          {species.vernacularName && <p className="text-sm text-gray-600">{species.vernacularName}</p>}
                        </div>
                        <Badge variant="secondary">{species.kingdom}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        {selectedSpecies ? (
          <div className="space-y-6">
            {/* Selected Species Info */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{selectedSpecies.scientificName}</CardTitle>
                    {selectedSpecies.vernacularName && (
                      <CardDescription className="text-base mt-1">{selectedSpecies.vernacularName}</CardDescription>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Badge>{selectedSpecies.kingdom}</Badge>
                    {selectedSpecies.family && <Badge variant="outline">{selectedSpecies.family}</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span>{observations.length} observations</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>
                      {observations.length > 0
                        ? `${Math.min(...observations.map((o) => new Date(o.eventDate).getFullYear()))} - ${Math.max(...observations.map((o) => new Date(o.eventDate).getFullYear()))}`
                        : "No date range"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Geographic Distribution</span>
                  </CardTitle>
                  <CardDescription>Observation locations across Poland</CardDescription>
                </CardHeader>
                <CardContent>
                  <SpeciesMap observations={observations} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Observation Timeline</span>
                  </CardTitle>
                  <CardDescription>Frequency of observations over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ObservationTimeline observations={observations} />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Default View */
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to BioDiversity Explorer</CardTitle>
                <CardDescription>
                  Discover and explore the rich biodiversity of Poland through GBIF data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {defaultStats && (
                    <>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-3xl font-bold text-green-600">
                          {defaultStats.totalSpecies.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Total Species</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-3xl font-bold text-blue-600">
                          {defaultStats.totalObservations.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Observations</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-3xl font-bold text-purple-600">{defaultStats.kingdoms}</div>
                        <div className="text-sm text-gray-600">Kingdoms</div>
                      </div>
                    </>
                  )}
                </div>
                <Separator className="my-6" />
                <div className="prose max-w-none">
                  <h3 className="text-lg font-semibold mb-3">How to use this application:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Use the search bar above to find species by their scientific or common names</li>
                    <li>
                      • Select a species from the search results to view its distribution map and observation timeline
                    </li>
                    <li>• Explore the geographic distribution to see where species have been observed</li>
                    <li>• Check the timeline to understand observation patterns over time</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Featured Species */}
            <Card>
              <CardHeader>
                <CardTitle>Featured Polish Species</CardTitle>
                <CardDescription>Some notable species commonly found in Poland</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { scientific: "Pinus sylvestris", common: "Scots Pine", kingdom: "Plantae" },
                    { scientific: "Cervus elaphus", common: "Red Deer", kingdom: "Animalia" },
                    { scientific: "Quercus robur", common: "English Oak", kingdom: "Plantae" },
                    { scientific: "Lynx lynx", common: "Eurasian Lynx", kingdom: "Animalia" },
                    { scientific: "Fagus sylvatica", common: "European Beech", kingdom: "Plantae" },
                    { scientific: "Aquila chrysaetos", common: "Golden Eagle", kingdom: "Animalia" },
                  ].map((species, index) => (
                    <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="font-medium text-sm">{species.scientific}</div>
                      <div className="text-xs text-gray-600">{species.common}</div>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {species.kingdom}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
