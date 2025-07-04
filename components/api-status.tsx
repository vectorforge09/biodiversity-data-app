"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Clock } from "lucide-react"

export default function ApiStatus() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking")
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch("/api/biodiversity/stats")
        const data = await response.json()

        if (response.ok && !data.error) {
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

    checkApiStatus()

    // Check status every 5 minutes
    const interval = setInterval(checkApiStatus, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = () => {
    switch (status) {
      case "checking":
        return <Clock className="h-3 w-3" />
      case "online":
        return <CheckCircle className="h-3 w-3" />
      case "offline":
        return <AlertCircle className="h-3 w-3" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case "checking":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "online":
        return "bg-green-100 text-green-800 border-green-300"
      case "offline":
        return "bg-red-100 text-red-800 border-red-300"
    }
  }

  const getStatusText = () => {
    switch (status) {
      case "checking":
        return "Checking GBIF API"
      case "online":
        return "GBIF API Online"
      case "offline":
        return "GBIF API Offline"
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className={`${getStatusColor()} flex items-center space-x-1`}>
        {getStatusIcon()}
        <span className="text-xs">{getStatusText()}</span>
      </Badge>
      {lastCheck && <span className="text-xs text-gray-500">Last checked: {lastCheck.toLocaleTimeString()}</span>}
    </div>
  )
}
