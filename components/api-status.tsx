"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Clock, WifiOff } from "lucide-react"
import { checkBackendHealth } from "@/lib/api"

type ApiStatus = "checking" | "online" | "offline" | "error"

export default function ApiStatus() {
  const [status, setStatus] = useState<ApiStatus>("checking")
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)

  useEffect(() => {
    const checkApiStatus = async () => {
      setStatus("checking")

      try {
        const isHealthy = await checkBackendHealth()

        if (isHealthy) {
          setStatus("online")
          setErrorDetails(null)
        } else {
          setStatus("offline")
          setErrorDetails("Backend API is not responding")
        }
      } catch (error) {
        setStatus("error")
        setErrorDetails(error instanceof Error ? error.message : "Unknown error")
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
          icon: <WifiOff className="h-3 w-3" />,
          text: "API Offline",
          className: "bg-red-100 text-red-800 border-red-300",
        }
      case "error":
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: "API Error",
          className: "bg-red-100 text-red-800 border-red-300",
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="flex items-center space-x-2">
      <Badge
        variant="outline"
        className={`${config.className} flex items-center space-x-1`}
        title={errorDetails || undefined}
      >
        {config.icon}
        <span className="text-xs">{config.text}</span>
      </Badge>
      {lastCheck && <span className="text-xs text-gray-500">{lastCheck.toLocaleTimeString()}</span>}
    </div>
  )
}
