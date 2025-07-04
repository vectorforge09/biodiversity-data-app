"use client"

import { useEffect, useRef } from "react"
import type { Observation } from "@/types/biodiversity"

interface SpeciesMapProps {
  observations: Observation[]
}

export default function SpeciesMap({ observations }: SpeciesMapProps) {
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
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Poland bounds
    const bounds = {
      north: 54.5,
      south: 49,
      east: 24.1,
      west: 14.1,
    }

    // Draw Poland outline (simplified)
    ctx.strokeStyle = "#64748b"
    ctx.lineWidth = 2
    ctx.strokeRect(20, 20, rect.width - 40, rect.height - 40)

    // Draw grid lines
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 1
    for (let i = 1; i < 5; i++) {
      const x = 20 + (i * (rect.width - 40)) / 5
      const y = 20 + (i * (rect.height - 40)) / 5
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
          ctx.globalAlpha = 0.7
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, 2 * Math.PI)
          ctx.fill()
        }
      })
    }

    // Reset alpha
    ctx.globalAlpha = 1

    // Add labels
    ctx.fillStyle = "#374151"
    ctx.font = "12px system-ui"
    ctx.fillText("Poland", 30, 40)
    ctx.fillText(`${observations.length} observations`, 30, rect.height - 30)

    // Add legend
    if (observations.length > 0) {
      ctx.fillStyle = "#10b981"
      ctx.beginPath()
      ctx.arc(rect.width - 80, rect.height - 30, 3, 0, 2 * Math.PI)
      ctx.fill()
      ctx.fillStyle = "#374151"
      ctx.fillText("Observation", rect.width - 70, rect.height - 26)
    }
  }, [observations])

  return (
    <div className="w-full h-64 relative">
      <canvas ref={canvasRef} className="w-full h-full border rounded-lg" style={{ width: "100%", height: "100%" }} />
      {observations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          No observation data available
        </div>
      )}
    </div>
  )
}
