"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { Observation } from "@/types/biodiversity"

interface ObservationTimelineProps {
  observations: Observation[]
}

export default function ObservationTimeline({ observations }: ObservationTimelineProps) {
  const timelineData = useMemo(() => {
    if (observations.length === 0) return []

    // Group observations by year
    const yearCounts: { [year: string]: number } = {}

    observations.forEach((obs) => {
      const year = new Date(obs.eventDate).getFullYear().toString()
      yearCounts[year] = (yearCounts[year] || 0) + 1
    })

    // Convert to array and sort by year
    return Object.entries(yearCounts)
      .map(([year, count]) => ({
        year: Number.parseInt(year),
        observations: count,
      }))
      .sort((a, b) => a.year - b.year)
  }, [observations])

  if (observations.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-500">No observation data available</div>
    )
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} tickFormatter={(value) => value.toString()} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(value) => `Year: ${value}`}
            formatter={(value: number) => [value, "Observations"]}
          />
          <Bar dataKey="observations" fill="#10b981" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
