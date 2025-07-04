"use client"
import { useEffect, useRef } from "react"
import type { Observation } from "@/types/biodiversity"

interface SpeciesMapProps {
  observations: Observation[]
}

export function SpeciesMap({ observations }: SpeciesMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Poland bounds (approximate)
    const bounds = {
      north: 54.5,
      south: 49.0,
      east: 24.1,
      west: 14.1,
    }

    // Draw Poland outline (simplified)
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 2
    ctx.strokeRect(20, 20, rect.width - 40, rect.height - 40)

    // Draw grid lines
    ctx.strokeStyle = "#f3f4f6"
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const x = 20 + (i * (rect.width - 40)) / 4
      const y = 20 + (i * (rect.height - 40)) / 4
      ctx.beginPath()
      ctx.moveTo(x, 20)
      ctx.lineTo(x, rect.height - 20)
      ctx.moveTo(20, y)
      ctx.lineTo(rect.width - 20, y)
      ctx.stroke()
    }

    // Plot observations
    if (observations.length > 0) {
      observations.forEach((obs) => {
        if (obs.decimalLatitude && obs.decimalLongitude) {
          // Convert lat/lng to canvas coordinates
          const x = 20 + ((obs.decimalLongitude - bounds.west) / (bounds.east - bounds.west)) * (rect.width - 40)
          const y = 20 + ((bounds.north - obs.decimalLatitude) / (bounds.north - bounds.south)) * (rect.height - 40)

          // Draw observation point
          ctx.fillStyle = "#10b981"
          ctx.beginPath()
          ctx.arc(x, y, 4, 0, 2 * Math.PI)
          ctx.fill()

          // Add subtle glow effect
          ctx.fillStyle = "rgba(16, 185, 129, 0.3)"
          ctx.beginPath()
          ctx.arc(x, y, 8, 0, 2 * Math.PI)
          ctx.fill()
        }
      })
    }

    // Add labels
    ctx.fillStyle = "#6b7280"
    ctx.font = "12px system-ui"
    ctx.textAlign = "center"
    ctx.fillText("Poland", rect.width / 2, rect.height - 5)

    if (observations.length === 0) {
      ctx.fillStyle = "#9ca3af"
      ctx.font = "14px system-ui"
      ctx.textAlign = "center"
      ctx.fillText("No observations to display", rect.width / 2, rect.height / 2)
    }
  }, [observations])

  return (
    <div className="relative w-full h-96 bg-gray-50 rounded-lg overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
      {observations.length > 0 && (
        <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs text-gray-600 shadow">
          {observations.length} observation{observations.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  )
}
