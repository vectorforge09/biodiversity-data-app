"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { Observation } from "@/types/biodiversity"

interface ObservationTimelineProps {
  observations: Observation[]
}

export function ObservationTimeline({ observations }: ObservationTimelineProps) {
  const timelineData = useMemo(() => {
    if (!observations.length) return []

    // Group observations by year
    const yearCounts: Record<string, number> = {}

    observations.forEach((obs) => {
      if (obs.eventDate) {
        const year = new Date(obs.eventDate).getFullYear().toString()
        yearCounts[year] = (yearCounts[year] || 0) + 1
      }
    })

    // Convert to array and sort by year
    return Object.entries(yearCounts)
      .map(([year, count]) => ({
        year,
        observations: count,
      }))
      .sort((a, b) => Number.parseInt(a.year) - Number.parseInt(b.year))
  }, [observations])

  if (timelineData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-lg mb-2">📊</div>
          <div>No temporal data available</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="year" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border rounded-lg shadow-lg">
                    <p className="font-medium">{`Year: ${label}`}</p>
                    <p className="text-green-600">{`Observations: ${payload[0].value}`}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="observations" fill="#10b981" radius={[4, 4, 0, 0]} stroke="#059669" strokeWidth={1} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
