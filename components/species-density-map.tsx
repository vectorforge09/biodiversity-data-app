"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useSpeciesMapTiles } from "@/hooks/use-api"
import type { Observation } from "@/types/biodiversity"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Layers, AlertCircle } from "lucide-react"

interface SpeciesDensityMapProps {
  speciesId: string | null
  observations: Observation[]
  speciesName?: string
}

export function SpeciesDensityMap({ speciesId, observations, speciesName }: SpeciesDensityMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{
    observation: Observation
    x: number
    y: number
  } | null>(null)

  // Get GBIF density map tile information
  const { data: mapTiles, loading: mapLoading, error: mapTilesError } = useSpeciesMapTiles(speciesId)

  // Poland geographic bounds
  const POLAND_BOUNDS = {
    north: 54.8389,
    south: 49.002,
    east: 24.1458,
    west: 14.1229,
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size with proper scaling for high DPI displays
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Map styling
    const mapPadding = 50
    const mapWidth = rect.width - mapPadding * 2
    const mapHeight = rect.height - mapPadding * 2

    // Draw background with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height)
    gradient.addColorStop(0, "#f0f9ff")
    gradient.addColorStop(1, "#e0f2fe")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Draw Poland border
    ctx.fillStyle = "#fefefe"
    ctx.strokeStyle = "#0891b2"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(mapPadding, mapPadding, mapWidth, mapHeight, 8)
    ctx.fill()
    ctx.stroke()

    // Draw coordinate grid
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])

    // Vertical grid lines (longitude)
    for (let i = 1; i < 5; i++) {
      const x = mapPadding + (i * mapWidth) / 5
      ctx.beginPath()
      ctx.moveTo(x, mapPadding)
      ctx.lineTo(x, mapPadding + mapHeight)
      ctx.stroke()
    }

    // Horizontal grid lines (latitude)
    for (let i = 1; i < 4; i++) {
      const y = mapPadding + (i * mapHeight) / 4
      ctx.beginPath()
      ctx.moveTo(mapPadding, y)
      ctx.lineTo(mapPadding + mapWidth, y)
      ctx.stroke()
    }

    ctx.setLineDash([]) // Reset line dash

    // Add coordinate labels
    ctx.fillStyle = "#475569"
    ctx.font = "11px system-ui, -apple-system, sans-serif"

    // Latitude labels (left side)
    ctx.textAlign = "right"
    for (let i = 0; i <= 4; i++) {
      const lat = POLAND_BOUNDS.south + (i * (POLAND_BOUNDS.north - POLAND_BOUNDS.south)) / 4
      const y = mapPadding + mapHeight - (i * mapHeight) / 4
      ctx.fillText(`${lat.toFixed(1)}°N`, mapPadding - 8, y + 4)
    }

    // Longitude labels (bottom)
    ctx.textAlign = "center"
    for (let i = 0; i <= 5; i++) {
      const lng = POLAND_BOUNDS.west + (i * (POLAND_BOUNDS.east - POLAND_BOUNDS.west)) / 5
      const x = mapPadding + (i * mapWidth) / 5
      ctx.fillText(`${lng.toFixed(1)}°E`, x, mapPadding + mapHeight + 20)
    }

    // If we have GBIF density map tiles, try to load and display them
    if (mapTiles && mapTiles.tileTemplate && !mapLoading && !mapTilesError) {
      // For demonstration, we'll show a message about GBIF density tiles
      ctx.fillStyle = "#059669"
      ctx.font = "bold 14px system-ui, -apple-system, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("GBIF Density Map Available", rect.width / 2, mapPadding + 30)

      ctx.font = "12px system-ui, -apple-system, sans-serif"
      ctx.fillStyle = "#6b7280"
      ctx.fillText("Tile URL: " + mapTiles.tileTemplate.substring(0, 50) + "...", rect.width / 2, mapPadding + 50)
    }

    // Plot individual observations as points
    if (observations && observations.length > 0) {
      // Create density map for overlapping points
      const pointDensity = new Map<string, number>()
      const validObservations = observations.filter(
        (obs) =>
          obs.decimalLatitude &&
          obs.decimalLongitude &&
          obs.decimalLatitude >= POLAND_BOUNDS.south &&
          obs.decimalLatitude <= POLAND_BOUNDS.north &&
          obs.decimalLongitude >= POLAND_BOUNDS.west &&
          obs.decimalLongitude <= POLAND_BOUNDS.east,
      )

      // Calculate point density
      validObservations.forEach((obs) => {
        const x = Math.round(
          mapPadding +
            ((obs.decimalLongitude - POLAND_BOUNDS.west) / (POLAND_BOUNDS.east - POLAND_BOUNDS.west)) * mapWidth,
        )
        const y = Math.round(
          mapPadding +
            ((POLAND_BOUNDS.north - obs.decimalLatitude) / (POLAND_BOUNDS.north - POLAND_BOUNDS.south)) * mapHeight,
        )
        const key = `${x},${y}`
        pointDensity.set(key, (pointDensity.get(key) || 0) + 1)
      })

      // Draw observation points with density-based styling
      validObservations.forEach((obs, index) => {
        const x =
          mapPadding +
          ((obs.decimalLongitude - POLAND_BOUNDS.west) / (POLAND_BOUNDS.east - POLAND_BOUNDS.west)) * mapWidth
        const y =
          mapPadding +
          ((POLAND_BOUNDS.north - obs.decimalLatitude) / (POLAND_BOUNDS.north - POLAND_BOUNDS.south)) * mapHeight

        const key = `${Math.round(x)},${Math.round(y)}`
        const density = pointDensity.get(key) || 1
        const baseRadius = Math.min(4 + Math.log(density) * 2, 12)

        // Draw glow effect
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, baseRadius + 6)
        glowGradient.addColorStop(0, "rgba(16, 185, 129, 0.4)")
        glowGradient.addColorStop(1, "rgba(16, 185, 129, 0)")
        ctx.fillStyle = glowGradient
        ctx.beginPath()
        ctx.arc(x, y, baseRadius + 6, 0, 2 * Math.PI)
        ctx.fill()

        // Draw main point with density-based color intensity
        const alpha = Math.min(0.7 + density * 0.1, 1)
        ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, baseRadius, 0, 2 * Math.PI)
        ctx.fill()

        // Add white border for better visibility
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()

        // Add inner highlight for high-density points
        if (density > 3) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
          ctx.beginPath()
          ctx.arc(x, y, baseRadius * 0.4, 0, 2 * Math.PI)
          ctx.fill()
        }
      })

      // Add observation count
      ctx.fillStyle = "#059669"
      ctx.font = "bold 14px system-ui, -apple-system, sans-serif"
      ctx.textAlign = "left"
      ctx.fillText(`${validObservations.length} observations`, 15, 25)

      if (validObservations.length !== observations.length) {
        ctx.fillStyle = "#dc2626"
        ctx.font = "12px system-ui, -apple-system, sans-serif"
        ctx.fillText(`${observations.length - validObservations.length} outside Poland bounds`, 15, 45)
      }
    } else if (!mapLoading) {
      // Empty state
      ctx.fillStyle = "#9ca3af"
      ctx.font = "18px system-ui, -apple-system, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("No observations to display", rect.width / 2, rect.height / 2 - 10)

      ctx.font = "14px system-ui, -apple-system, sans-serif"
      ctx.fillStyle = "#6b7280"
      ctx.fillText("Select a species to view its distribution across Poland", rect.width / 2, rect.height / 2 + 15)
    }

    // Add title
    ctx.fillStyle = "#1f2937"
    ctx.font = "bold 16px system-ui, -apple-system, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("Poland", rect.width / 2, rect.height - 15)

    // Add compass rose
    const compassX = rect.width - 40
    const compassY = 40
    ctx.strokeStyle = "#6b7280"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(compassX, compassY - 15)
    ctx.lineTo(compassX, compassY + 15)
    ctx.moveTo(compassX - 15, compassY)
    ctx.lineTo(compassX + 15, compassY)
    ctx.stroke()

    ctx.fillStyle = "#374151"
    ctx.font = "bold 10px system-ui, -apple-system, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("N", compassX, compassY - 18)

    setMapLoaded(true)
  }, [observations, mapTiles, mapLoading, mapTilesError])

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !observations || observations.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const mapPadding = 50
    const mapWidth = rect.width - mapPadding * 2
    const mapHeight = rect.height - mapPadding * 2

    // Find closest observation point
    let closestPoint: { observation: Observation; x: number; y: number } | null = null
    let minDistance = Number.POSITIVE_INFINITY

    observations.forEach((obs) => {
      if (obs.decimalLatitude && obs.decimalLongitude) {
        const pointX =
          mapPadding +
          ((obs.decimalLongitude - POLAND_BOUNDS.west) / (POLAND_BOUNDS.east - POLAND_BOUNDS.west)) * mapWidth
        const pointY =
          mapPadding +
          ((POLAND_BOUNDS.north - obs.decimalLatitude) / (POLAND_BOUNDS.north - POLAND_BOUNDS.south)) * mapHeight

        const distance = Math.sqrt((x - pointX) ** 2 + (y - pointY) ** 2)

        if (distance < 20 && distance < minDistance) {
          minDistance = distance
          closestPoint = { observation: obs, x: pointX, y: pointY }
        }
      }
    })

    setHoveredPoint(closestPoint)
  }

  const handleMouseLeave = () => {
    setHoveredPoint(null)
  }

  if (mapLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            GBIF Density Map
          </CardTitle>
          <CardDescription>Loading GBIF density map tiles...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <div className="text-lg font-medium text-gray-600">Loading density map...</div>
              <div className="text-sm text-gray-500">Fetching GBIF map tiles</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (mapTilesError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Map Error
          </CardTitle>
          <CardDescription>Failed to load GBIF density map</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-red-50 rounded-lg flex items-center justify-center">
            <div className="text-center space-y-3">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <div className="text-lg font-medium text-red-700">Map tiles unavailable</div>
              <div className="text-sm text-red-600">{mapTilesError}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-600" />
          Species Distribution Map
          {speciesName && <Badge variant="outline">{speciesName}</Badge>}
        </CardTitle>
        <CardDescription className="flex items-center gap-4">
          <span>GBIF density visualization for Poland</span>
          {mapTiles && (
            <Badge variant="secondary" className="text-xs">
              Tiles: {mapTiles.attribution}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-96 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl overflow-hidden border-2 border-blue-100 shadow-sm">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            style={{ width: "100%", height: "100%" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />

          {/* Enhanced Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute z-20 bg-white p-4 rounded-lg shadow-xl border-2 border-green-200 pointer-events-none max-w-sm"
              style={{
                left: Math.min(hoveredPoint.x + 15, 400),
                top: Math.max(hoveredPoint.y - 100, 10),
              }}
            >
              <div className="space-y-2">
                <div className="font-bold text-gray-900 text-sm border-b border-gray-200 pb-2">
                  📍 {hoveredPoint.observation.locality || "Unknown location"}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Coordinates:</span>
                    <div className="font-mono text-gray-800">
                      {hoveredPoint.observation.decimalLatitude?.toFixed(4)}°N
                    </div>
                    <div className="font-mono text-gray-800">
                      {hoveredPoint.observation.decimalLongitude?.toFixed(4)}°E
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Date:</span>
                    <div className="font-medium text-gray-800">
                      {new Date(hoveredPoint.observation.eventDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {hoveredPoint.observation.recordedBy && (
                  <div className="text-xs text-gray-600 border-t border-gray-100 pt-2">
                    <span className="text-gray-500">Recorded by:</span> {hoveredPoint.observation.recordedBy}
                  </div>
                )}
                {hoveredPoint.observation.institutionCode && (
                  <div className="text-xs text-gray-600">
                    <span className="text-gray-500">Institution:</span> {hoveredPoint.observation.institutionCode}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Legend */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                <span>Observation Location</span>
              </div>
              {observations && observations.length > 0 && (
                <div className="text-xs text-gray-600">
                  {observations.length} record{observations.length !== 1 ? "s" : ""} • Larger dots = multiple
                  observations
                </div>
              )}
              {mapTiles && mapTiles.tileTemplate && (
                <div className="text-xs text-blue-600 border-t border-gray-200 pt-2">
                  <Layers className="h-3 w-3 inline mr-1" />
                  GBIF Density Tiles Available
                </div>
              )}
            </div>
          </div>

          {/* Scale indicator */}
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-200">
            <div className="text-xs text-gray-600 text-center">
              <div className="font-medium">Poland</div>
              <div>49°N - 55°N</div>
              <div>14°E - 24°E</div>
            </div>
          </div>
        </div>

        {/* Map Information */}
        {mapTiles && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">GBIF Density Map Integration</div>
              <div className="text-xs text-blue-600">
                Species Key: {mapTiles.speciesKey} • Tile Template Available • Attribution: {mapTiles.attribution}
              </div>
              <div className="text-xs text-blue-500 mt-1 font-mono break-all">
                {mapTiles.tileTemplate.substring(0, 80)}...
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
