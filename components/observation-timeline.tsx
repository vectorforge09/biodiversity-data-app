"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { Observation } from "@/types/biodiversity"

interface ObservationTimelineProps {
  observations: Observation[]
}

export function ObservationTimeline({ observations }: ObservationTimelineProps) {
  const timelineData = useMemo(() => {
    if (!observations || observations.length === 0) return []

    // Group observations by year
    const yearCounts: Record<string, number> = {}

    observations.forEach((obs) => {
      if (obs.eventDate) {
        try {
          const date = new Date(obs.eventDate)
          const year = date.getFullYear()

          // Only include valid years
          if (year >= 1900 && year <= new Date().getFullYear()) {
            const yearStr = year.toString()
            yearCounts[yearStr] = (yearCounts[yearStr] || 0) + 1
          }
        } catch (error) {
          console.warn("Invalid date format:", obs.eventDate)
        }
      }
    })

    // Convert to array and sort by year
    const sortedData = Object.entries(yearCounts)
      .map(([year, count]) => ({
        year,
        observations: count,
        yearNum: Number.parseInt(year),
      }))
      .sort((a, b) => a.yearNum - b.yearNum)

    // If we have more than 20 years, show only the most recent 20
    return sortedData.slice(-20)
  }, [observations])

  if (!observations || observations.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg border">
        <div className="text-center space-y-2">
          <div className="text-4xl">📊</div>
          <div className="text-lg font-medium">No observation data</div>
          <div className="text-sm text-gray-400">Select a species to view its observation timeline</div>
        </div>
      </div>
    )
  }

  if (timelineData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg border">
        <div className="text-center space-y-2">
          <div className="text-4xl">📅</div>
          <div className="text-lg font-medium">No temporal data available</div>
          <div className="text-sm text-gray-400">
            {observations.length} observation{observations.length !== 1 ? "s" : ""} found, but no valid dates
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-96 w-full bg-white rounded-lg border p-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700">Observations over time ({observations.length} total)</h3>
        <p className="text-xs text-gray-500">
          Showing {timelineData.length} year{timelineData.length !== 1 ? "s" : ""} with recorded observations
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="year"
              stroke="#64748b"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                fontSize: "14px",
              }}
              formatter={(value: number, name: string) => [`${value} observation${value !== 1 ? "s" : ""}`, "Count"]}
              labelFormatter={(label: string) => `Year: ${label}`}
              cursor={{ fill: "rgba(16, 185, 129, 0.1)" }}
            />
            <Bar dataKey="observations" fill="#10b981" radius={[4, 4, 0, 0]} stroke="#059669" strokeWidth={1} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
