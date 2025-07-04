"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import type { Observation } from "@/types/biodiversity"

interface ObservationTimelineProps {
  observations: Observation[]
}

interface TimelineDataPoint {
  year: string
  observations: number
  yearNum: number
  percentage: number
}

export function ObservationTimeline({ observations }: ObservationTimelineProps) {
  const { timelineData, totalObservations, yearRange } = useMemo(() => {
    if (!observations || observations.length === 0) {
      return { timelineData: [], totalObservations: 0, yearRange: null }
    }

    // Group observations by year with better date parsing
    const yearCounts: Record<string, number> = {}
    let validDates = 0

    observations.forEach((obs) => {
      if (obs.eventDate) {
        try {
          // Handle different date formats
          let date: Date
          if (obs.eventDate.includes("T")) {
            date = new Date(obs.eventDate)
          } else if (obs.eventDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = new Date(obs.eventDate + "T00:00:00")
          } else if (obs.eventDate.match(/^\d{4}$/)) {
            date = new Date(Number.parseInt(obs.eventDate), 0, 1)
          } else {
            date = new Date(obs.eventDate)
          }

          const year = date.getFullYear()

          // Only include valid years (reasonable range for biodiversity data)
          if (year >= 1800 && year <= new Date().getFullYear() && !isNaN(year)) {
            const yearStr = year.toString()
            yearCounts[yearStr] = (yearCounts[yearStr] || 0) + 1
            validDates++
          }
        } catch (error) {
          console.warn("Invalid date format:", obs.eventDate)
        }
      }
    })

    if (validDates === 0) {
      return { timelineData: [], totalObservations: observations.length, yearRange: null }
    }

    // Convert to array and sort by year
    const sortedEntries = Object.entries(yearCounts)
      .map(([year, count]) => ({
        year,
        observations: count,
        yearNum: Number.parseInt(year),
        percentage: (count / validDates) * 100,
      }))
      .sort((a, b) => a.yearNum - b.yearNum)

    // Determine appropriate year range to display
    const minYear = sortedEntries[0]?.yearNum || new Date().getFullYear()
    const maxYear = sortedEntries[sortedEntries.length - 1]?.yearNum || new Date().getFullYear()
    const yearSpan = maxYear - minYear

    let displayData: TimelineDataPoint[]

    if (yearSpan <= 30) {
      // Show all years if span is reasonable
      displayData = sortedEntries
    } else {
      // Show last 25 years for better visualization
      displayData = sortedEntries.slice(-25)
    }

    return {
      timelineData: displayData,
      totalObservations: validDates,
      yearRange: { min: minYear, max: maxYear, span: yearSpan },
    }
  }, [observations])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-blue-200">
          <div className="font-bold text-gray-900 mb-2">Year {label}</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-blue-600">Observations:</span>
              <span className="font-bold">{data.observations}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">Percentage:</span>
              <span className="font-medium">{data.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  if (!observations || observations.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-gray-200">
        <div className="text-center space-y-4">
          <div className="text-6xl">📊</div>
          <div className="text-xl font-bold text-gray-700">No observation data</div>
          <div className="text-sm text-gray-500 max-w-md">
            Select a species from the search results to view its observation timeline and see when it has been recorded
            over time.
          </div>
        </div>
      </div>
    )
  }

  if (timelineData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-50 to-amber-50 rounded-xl border-2 border-amber-200">
        <div className="text-center space-y-4">
          <div className="text-6xl">📅</div>
          <div className="text-xl font-bold text-gray-700">No temporal data available</div>
          <div className="text-sm text-gray-500 max-w-md">
            Found {observations.length} observation{observations.length !== 1 ? "s" : ""}, but no valid dates could be
            parsed for timeline visualization.
          </div>
        </div>
      </div>
    )
  }

  const chartType = timelineData.length > 15 ? "line" : "bar"

  return (
    <div className="h-96 w-full bg-white rounded-xl border-2 border-blue-100 p-4 shadow-sm">
      {/* Header with statistics */}
      <div className="mb-4 pb-3 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Observation Timeline ({totalObservations} records)</h3>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>
            📊 {timelineData.length} year{timelineData.length !== 1 ? "s" : ""} with data
          </span>
          {yearRange && (
            <>
              <span>
                📅 {yearRange.min} - {yearRange.max}
              </span>
              <span>⏱️ {yearRange.span} year span</span>
            </>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="year"
                stroke="#64748b"
                fontSize={11}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="observations" fill="#3b82f6" radius={[4, 4, 0, 0]} stroke="#2563eb" strokeWidth={1} />
            </BarChart>
          ) : (
            <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="year"
                stroke="#64748b"
                fontSize={11}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={Math.ceil(timelineData.length / 10)}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="observations"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2, fill: "#ffffff" }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer with insights */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          {timelineData.length > 0 && (
            <>
              <span>
                📈 Peak year:{" "}
                {timelineData.reduce((max, curr) => (curr.observations > max.observations ? curr : max)).year} (
                {timelineData.reduce((max, curr) => (curr.observations > max.observations ? curr : max)).observations}{" "}
                observations)
              </span>
              <span>📊 Average: {Math.round(totalObservations / timelineData.length)} per year</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
