"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import type { Observation } from "@/types/biodiversity"

interface SpeciesMapProps {
  observations: Observation[]
}

export function SpeciesMap({ observations }: SpeciesMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{
    observation: Observation
    x: number
    y: number
  } | null>(null)
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 })

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

    setMapDimensions({ width: rect.width, height: rect.height })

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Poland geographic bounds (precise)
    const bounds = {
      north: 54.8389,
      south: 49.002,
      east: 24.1458,
      west: 14.1229,
    }

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

    // Draw Poland border (simplified rectangle with rounded corners)
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
      const lat = bounds.south + (i * (bounds.north - bounds.south)) / 4
      const y = mapPadding + mapHeight - (i * mapHeight) / 4
      ctx.fillText(`${lat.toFixed(1)}°N`, mapPadding - 8, y + 4)
    }

    // Longitude labels (bottom)
    ctx.textAlign = "center"
    for (let i = 0; i <= 5; i++) {
      const lng = bounds.west + (i * (bounds.east - bounds.west)) / 5
      const x = mapPadding + (i * mapWidth) / 5
      ctx.fillText(`${lng.toFixed(1)}°E`, x, mapPadding + mapHeight + 20)
    }

    // Plot observations with enhanced visualization
    if (observations && observations.length > 0) {
      // Create density map for overlapping points
      const pointDensity = new Map<string, number>()
      const validObservations = observations.filter(
        (obs) =>
          obs.decimalLatitude &&
          obs.decimalLongitude &&
          obs.decimalLatitude >= bounds.south &&
          obs.decimalLatitude <= bounds.north &&
          obs.decimalLongitude >= bounds.west &&
          obs.decimalLongitude <= bounds.east,
      )

      // Calculate point density
      validObservations.forEach((obs) => {
        const x = Math.round(
          mapPadding + ((obs.decimalLongitude - bounds.west) / (bounds.east - bounds.west)) * mapWidth,
        )
        const y = Math.round(
          mapPadding + ((bounds.north - obs.decimalLatitude) / (bounds.north - bounds.south)) * mapHeight,
        )
        const key = `${x},${y}`
        pointDensity.set(key, (pointDensity.get(key) || 0) + 1)
      })

      // Draw observation points with density-based sizing and quality indicators
      validObservations.forEach((obs, index) => {
        const x = mapPadding + ((obs.decimalLongitude - bounds.west) / (bounds.east - bounds.west)) * mapWidth
        const y = mapPadding + ((bounds.north - obs.decimalLatitude) / (bounds.north - bounds.south)) * mapHeight

        const key = `${Math.round(x)},${Math.round(y)}`
        const density = pointDensity.get(key) || 1
        const baseRadius = Math.min(4 + Math.log(density) * 2, 12)

        // Color based on coordinate uncertainty (data quality)
        let pointColor = "#10b981" // Default green
        const strokeColor = "#ffffff"

        if (obs.coordinateUncertaintyInMeters) {
          if (obs.coordinateUncertaintyInMeters > 1000) {
            pointColor = "#f59e0b" // Orange for uncertain coordinates
          } else if (obs.coordinateUncertaintyInMeters > 100) {
            pointColor = "#eab308" // Yellow for moderate uncertainty
          }
        }

        // Draw glow effect
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, baseRadius + 6)
        glowGradient.addColorStop(0, `${pointColor}66`) // 40% opacity
        glowGradient.addColorStop(1, `${pointColor}00`) // 0% opacity
        ctx.fillStyle = glowGradient
        ctx.beginPath()
        ctx.arc(x, y, baseRadius + 6, 0, 2 * Math.PI)
        ctx.fill()

        // Draw main point
        const alpha = Math.min(0.7 + density * 0.1, 1)
        ctx.fillStyle = pointColor
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(x, y, baseRadius, 0, 2 * Math.PI)
        ctx.fill()
        ctx.globalAlpha = 1

        // Add white border for better visibility
        ctx.strokeStyle = strokeColor
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

      // Add observation count and quality info
      ctx.fillStyle = "#059669"
      ctx.font = "bold 14px system-ui, -apple-system, sans-serif"
      ctx.textAlign = "left"
      ctx.fillText(`${validObservations.length} observations`, 15, 25)

      // Show data quality summary
      const highQuality = validObservations.filter(
        (obs) => !obs.coordinateUncertaintyInMeters || obs.coordinateUncertaintyInMeters <= 100,
      ).length

      if (highQuality > 0) {
        ctx.fillStyle = "#059669"
        ctx.font = "12px system-ui, -apple-system, sans-serif"
        ctx.fillText(`${highQuality} high precision`, 15, 45)
      }

      if (validObservations.length !== observations.length) {
        ctx.fillStyle = "#dc2626"
        ctx.font = "12px system-ui, -apple-system, sans-serif"
        ctx.fillText(`${observations.length - validObservations.length} outside Poland bounds`, 15, 65)
      }
    } else {
      // Empty state
      ctx.fillStyle = "#9ca3af"
      ctx.font = "18px system-ui, -apple-system, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("No observations to display", rect.width / 2, rect.height / 2 - 10)

      ctx.font = "14px system-ui, -apple-system, sans-serif"
      ctx.fillStyle = "#6b7280"
      ctx.fillText("Select a species to view its distribution across Poland", rect.width / 2, rect.height / 2 + 15)
    }

    // Add title and region label
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
  }, [observations])

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !observations || observations.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const bounds = {
      north: 54.8389,
      south: 49.002,
      east: 24.1458,
      west: 14.1229,
    }

    const mapPadding = 50
    const mapWidth = rect.width - mapPadding * 2
    const mapHeight = rect.height - mapPadding * 2

    // Find closest observation point
    let closestPoint: { observation: Observation; x: number; y: number } | null = null
    let minDistance = Number.POSITIVE_INFINITY

    observations.forEach((obs) => {
      if (obs.decimalLatitude && obs.decimalLongitude) {
        const pointX = mapPadding + ((obs.decimalLongitude - bounds.west) / (bounds.east - bounds.west)) * mapWidth
        const pointY = mapPadding + ((bounds.north - obs.decimalLatitude) / (bounds.north - bounds.south)) * mapHeight

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

  return (
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
            left: Math.min(hoveredPoint.x + 15, mapDimensions.width - 280),
            top: Math.max(hoveredPoint.y - 120, 10),
          }}
        >
          <div className="space-y-2">
            <div className="font-bold text-gray-900 text-sm border-b border-gray-200 pb-2">
              📍{" "}
              {hoveredPoint.observation.locality ||
                `${hoveredPoint.observation.municipality || ""} ${hoveredPoint.observation.stateProvince || ""}`.trim() ||
                "Unknown location"}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Coordinates:</span>
                <div className="font-mono text-gray-800">{hoveredPoint.observation.decimalLatitude?.toFixed(4)}°N</div>
                <div className="font-mono text-gray-800">{hoveredPoint.observation.decimalLongitude?.toFixed(4)}°E</div>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <div className="font-medium text-gray-800">
                  {hoveredPoint.observation.eventDate !== "Unknown"
                    ? new Date(hoveredPoint.observation.eventDate).toLocaleDateString()
                    : "Unknown"}
                </div>
              </div>
            </div>
            {hoveredPoint.observation.coordinateUncertaintyInMeters && (
              <div className="text-xs text-gray-600 border-t border-gray-100 pt-2">
                <span className="text-gray-500">Precision:</span> ±
                {hoveredPoint.observation.coordinateUncertaintyInMeters}m
              </div>
            )}
            {hoveredPoint.observation.recordedBy && (
              <div className="text-xs text-gray-600">
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
            <span>High Precision</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow-sm"></div>
            <span>Medium Precision</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-sm"></div>
            <span>Low Precision</span>
          </div>
          {observations && observations.length > 0 && (
            <div className="text-xs text-gray-600 pt-1 border-t border-gray-200">
              {observations.length} record{observations.length !== 1 ? "s" : ""} • Larger dots = multiple observations
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
  )
}
