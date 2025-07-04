"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, WifiOff, AlertTriangle } from "lucide-react"
import { checkBackendHealth } from "@/lib/api"

type ApiStatus = "checking" | "online" | "offline" | "mock"

export default function ApiStatus() {
  const [status, setStatus] = useState<ApiStatus>("checking")
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [backendUrl, setBackendUrl] = useState<string>("")

  useEffect(() => {
    // Get the backend URL for display
    setBackendUrl(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  }, [])

  useEffect(() => {
    const checkApiStatus = async () => {
      setStatus("checking")

      try {
        const isHealthy = await checkBackendHealth()

        if (isHealthy) {
          setStatus("online")
        } else {
          setStatus("offline")
        }
      } catch (error) {
        setStatus("offline")
      } finally {
        setLastCheck(new Date())
      }
    }

    // Initial check
    checkApiStatus()

    // Check status every 30 seconds
    const interval = setInterval(checkApiStatus, 30 * 1000)

    return () => clearInterval(interval)
  }, [])

  const getStatusConfig = () => {
    switch (status) {
      case "checking":
        return {
          icon: <Clock className="h-3 w-3 animate-spin" />,
          text: "Checking API",
          className: "bg-yellow-100 text-yellow-800 border-yellow-300",
        }
      case "online":
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          text: "FastAPI Online",
          className: "bg-green-100 text-green-800 border-green-300",
        }
      case "offline":
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: "Using Mock Data",
          className: "bg-orange-100 text-orange-800 border-orange-300",
        }
      case "mock":
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: "Mock Mode",
          className: "bg-blue-100 text-blue-800 border-blue-300",
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="flex items-center space-x-2">
      <Badge
        variant="outline"
        className={`${config.className} flex items-center space-x-1`}
        title={
          status === "offline"
            ? `Backend not available at ${backendUrl}. Using mock data for demonstration.`
            : undefined
        }
      >
        {config.icon}
        <span className="text-xs">{config.text}</span>
      </Badge>
      {lastCheck && <span className="text-xs text-gray-500">{lastCheck.toLocaleTimeString()}</span>}
    </div>
  )
}
