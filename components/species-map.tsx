"use client"

import { useEffect, useRef } from "react"
import type { Observation } from "@/types/biodiversity"

interface SpeciesMapProps {
  observations: Observation[]
}

export default function SpeciesMap({ observations }: SpeciesMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || observations.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw Poland outline (simplified)
    ctx.strokeStyle = "#374151"
    ctx.lineWidth = 2
    ctx.fillStyle = "#f3f4f6"

    // Simplified Poland border
    ctx.beginPath()
    ctx.moveTo(50, 50)
    ctx.lineTo(350, 50)
    ctx.lineTo(380, 100)
    ctx.lineTo(370, 200)
    ctx.lineTo(320, 280)
    ctx.lineTo(80, 270)
    ctx.lineTo(30, 150)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Plot observations
    const mapWidth = 400
    const mapHeight = 300

    // Get bounds of observations
    const lats = observations.map((o) => o.decimalLatitude).filter((lat) => lat !== null) as number[]
    const lngs = observations.map((o) => o.decimalLongitude).filter((lng) => lng !== null) as number[]

    if (lats.length === 0 || lngs.length === 0) return

    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    // Plot points
    ctx.fillStyle = "#dc2626"
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1

    observations.forEach((obs) => {
      if (obs.decimalLatitude && obs.decimalLongitude) {
        // Normalize coordinates to map bounds
        const x = 50 + ((obs.decimalLongitude - minLng) / (maxLng - minLng)) * 300
        const y = 50 + ((maxLat - obs.decimalLatitude) / (maxLat - minLat)) * 200

        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
      }
    })

    // Add legend
    ctx.fillStyle = "#374151"
    ctx.font = "12px sans-serif"
    ctx.fillText("• Observation locations", 20, mapHeight - 20)
  }, [observations])

  if (observations.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">No observation data available</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="w-full h-64 border rounded-lg" style={{ maxWidth: "100%" }} />
      <div className="mt-2 text-xs text-gray-600">
        Showing {observations.filter((o) => o.decimalLatitude && o.decimalLongitude).length} georeferenced observations
      </div>
    </div>
  )
}
