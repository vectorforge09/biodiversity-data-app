"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import type { Observation } from "@/types/biodiversity"

interface SpeciesMapProps {
  observations: Observation[]
}

export function SpeciesMap({ observations }: SpeciesMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{ observation: Observation; x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size with proper scaling
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Poland bounds
    const bounds = {
      north: 54.5,
      south: 49.0,
      east: 24.1,
      west: 14.1,
    }

    // Draw background
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Draw Poland outline (simplified rectangle)
    const mapPadding = 40
    const mapWidth = rect.width - mapPadding * 2
    const mapHeight = rect.height - mapPadding * 2

    ctx.strokeStyle = "#cbd5e1"
    ctx.lineWidth = 2
    ctx.strokeRect(mapPadding, mapPadding, mapWidth, mapHeight)

    // Draw grid lines
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const x = mapPadding + (i * mapWidth) / 4
      const y = mapPadding + (i * mapHeight) / 4

      // Vertical lines
      ctx.beginPath()
      ctx.moveTo(x, mapPadding)
      ctx.lineTo(x, mapPadding + mapHeight)
      ctx.stroke()

      // Horizontal lines
      ctx.beginPath()
      ctx.moveTo(mapPadding, y)
      ctx.lineTo(mapPadding + mapWidth, y)
      ctx.stroke()
    }

    // Add coordinate labels
    ctx.fillStyle = "#64748b"
    ctx.font = "10px system-ui"
    ctx.textAlign = "center"

    // Latitude labels (left side)
    for (let i = 0; i <= 4; i++) {
      const lat = bounds.south + (i * (bounds.north - bounds.south)) / 4
      const y = mapPadding + mapHeight - (i * mapHeight) / 4
      ctx.textAlign = "right"
      ctx.fillText(`${lat.toFixed(1)}°N`, mapPadding - 5, y + 3)
    }

    // Longitude labels (bottom)
    for (let i = 0; i <= 4; i++) {
      const lng = bounds.west + (i * (bounds.east - bounds.west)) / 4
      const x = mapPadding + (i * mapWidth) / 4
      ctx.textAlign = "center"
      ctx.fillText(`${lng.toFixed(1)}°E`, x, mapPadding + mapHeight + 15)
    }

    // Plot observations
    if (observations && observations.length > 0) {
      observations.forEach((obs, index) => {
        if (obs.decimalLatitude && obs.decimalLongitude) {
          // Convert lat/lng to canvas coordinates
          const x = mapPadding + ((obs.decimalLongitude - bounds.west) / (bounds.east - bounds.west)) * mapWidth
          const y = mapPadding + ((bounds.north - obs.decimalLatitude) / (bounds.north - bounds.south)) * mapHeight

          // Ensure point is within bounds
          if (x >= mapPadding && x <= mapPadding + mapWidth && y >= mapPadding && y <= mapPadding + mapHeight) {
            // Draw glow effect
            ctx.fillStyle = "rgba(16, 185, 129, 0.2)"
            ctx.beginPath()
            ctx.arc(x, y, 8, 0, 2 * Math.PI)
            ctx.fill()

            // Draw main point
            ctx.fillStyle = "#10b981"
            ctx.beginPath()
            ctx.arc(x, y, 4, 0, 2 * Math.PI)
            ctx.fill()

            // Add white border
            ctx.strokeStyle = "#ffffff"
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      })
    }

    // Add title
    ctx.fillStyle = "#1f2937"
    ctx.font = "14px system-ui"
    ctx.textAlign = "center"
    ctx.fillText("Poland", rect.width / 2, rect.height - 10)

    // Add observation count
    if (observations && observations.length > 0) {
      ctx.fillStyle = "#059669"
      ctx.font = "12px system-ui"
      ctx.textAlign = "left"
      ctx.fillText(`${observations.length} observations`, 10, 20)
    } else {
      ctx.fillStyle = "#6b7280"
      ctx.font = "14px system-ui"
      ctx.textAlign = "center"
      ctx.fillText("No observations to display", rect.width / 2, rect.height / 2)
      ctx.fillText("Select a species to view its distribution", rect.width / 2, rect.height / 2 + 20)
    }
  }, [observations])

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !observations || observations.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const bounds = {
      north: 54.5,
      south: 49.0,
      east: 24.1,
      west: 14.1,
    }

    const mapPadding = 40
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

        if (distance < 15 && distance < minDistance) {
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
    <div className="relative w-full h-96 bg-gray-50 rounded-lg overflow-hidden border">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ width: "100%", height: "100%" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute z-10 bg-white p-3 rounded-lg shadow-lg border pointer-events-none max-w-xs"
          style={{
            left: Math.min(hoveredPoint.x + 10, window.innerWidth - 200),
            top: Math.max(hoveredPoint.y - 80, 10),
          }}
        >
          <div className="text-sm space-y-1">
            <div className="font-semibold text-gray-900">{hoveredPoint.observation.locality || "Unknown location"}</div>
            <div className="text-gray-600">
              {hoveredPoint.observation.decimalLatitude?.toFixed(4)}°N,{" "}
              {hoveredPoint.observation.decimalLongitude?.toFixed(4)}°E
            </div>
            <div className="text-gray-600">{new Date(hoveredPoint.observation.eventDate).toLocaleDateString()}</div>
            {hoveredPoint.observation.recordedBy && (
              <div className="text-gray-500 text-xs">Recorded by: {hoveredPoint.observation.recordedBy}</div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
          <span className="text-gray-700">
            Observation {observations && observations.length > 0 && `(${observations.length})`}
          </span>
        </div>
      </div>
    </div>
  )
}
