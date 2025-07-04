"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import type { Observation } from "@/types/biodiversity"

interface ObservationTimelineProps {
  observations: Observation[]
}

export function ObservationTimeline({ observations }: ObservationTimelineProps) {
  const { yearlyData, monthlyData, totalYears } = useMemo(() => {
    if (!observations || observations.length === 0) {
      return { yearlyData: [], monthlyData: [], totalYears: 0 }
    }

    // Group observations by year and month
    const yearCounts: Record<string, number> = {}
    const monthCounts: Record<string, number> = {}

    observations.forEach((obs) => {
      if (obs.eventDate) {
        try {
          const date = new Date(obs.eventDate)
          const year = date.getFullYear()
          const month = date.getMonth() + 1 // 1-12

          // Only include valid years
          if (year >= 1900 && year <= new Date().getFullYear()) {
            const yearStr = year.toString()
            yearCounts[yearStr] = (yearCounts[yearStr] || 0) + 1

            const monthStr = date.toLocaleDateString("en-US", { month: "short" })
            monthCounts[monthStr] = (monthCounts[monthStr] || 0) + 1
          }
        } catch (error) {
          console.warn("Invalid date format:", obs.eventDate)
        }
      }
    })

    // Convert to arrays and sort
    const yearlyData = Object.entries(yearCounts)
      .map(([year, count]) => ({
        year,
        observations: count,
        yearNum: Number.parseInt(year),
      }))
      .sort((a, b) => a.yearNum - b.yearNum)

    // Monthly data for seasonal patterns
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const monthlyData = monthOrder.map((month) => ({
      month,
      observations: monthCounts[month] || 0,
    }))

    return {
      yearlyData: yearlyData.slice(-15), // Show last 15 years max
      monthlyData,
      totalYears: yearlyData.length,
    }
  }, [observations])

  if (!observations || observations.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg border">
        <div className="text-center space-y-2">
          <div className="text-4xl">📊</div>
          <div className="text-lg font-medium">No observation data</div>
          <div className="text-sm text-gray-400">Search and select a species to view its observation timeline</div>
        </div>
      </div>
    )
  }

  if (yearlyData.length === 0) {
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
    <div className="h-96 w-full bg-white rounded-lg border">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Observation Timeline</h3>
        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
          <span>{observations.length} total observations</span>
          <span>•</span>
          <span>{totalYears} years with data</span>
          <span>•</span>
          <span>
            {yearlyData[0]?.year} - {yearlyData[yearlyData.length - 1]?.year}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Yearly Timeline */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Observations by Year</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value} observations`, "Count"]}
                  labelFormatter={(label: string) => `Year: ${label}`}
                />
                <Bar dataKey="observations" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Pattern */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Seasonal Pattern (All Years)</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value} observations`, "Count"]}
                  labelFormatter={(label: string) => `Month: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="observations"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: "#10b981", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
