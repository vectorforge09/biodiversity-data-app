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
      .map(([year, count]) => ({ year, observations: count }))
      .sort((a, b) => Number.parseInt(a.year) - Number.parseInt(b.year))
  }, [observations])

  if (observations.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">No observation data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" fontSize={12} tick={{ fill: "#6b7280" }} />
            <YAxis fontSize={12} tick={{ fill: "#6b7280" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#374151" }}
            />
            <Bar dataKey="observations" fill="#059669" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-gray-600">
        Total observations: {observations.length} | Years covered:{" "}
        {timelineData.length > 0 ? `${timelineData[0].year} - ${timelineData[timelineData.length - 1].year}` : "N/A"}
      </div>
    </div>
  )
}
