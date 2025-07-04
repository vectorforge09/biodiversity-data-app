"use client"

import { useApiHealth } from "@/hooks/use-api"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ApiStatus() {
  const { isOnline, lastChecked, checkHealth } = useApiHealth()

  const getStatusInfo = () => {
    if (isOnline === null) {
      return {
        icon: <RefreshCw className="h-3 w-3 animate-spin" />,
        text: "Checking...",
        variant: "secondary" as const,
        description: "Checking FastAPI backend status...",
      }
    }

    if (isOnline) {
      return {
        icon: <CheckCircle className="h-3 w-3" />,
        text: "FastAPI Online",
        variant: "default" as const,
        description: `Connected to FastAPI backend. Last checked: ${lastChecked?.toLocaleTimeString()}`,
      }
    }

    return {
      icon: <XCircle className="h-3 w-3" />,
      text: "Using Mock Data",
      variant: "destructive" as const,
      description: `FastAPI backend unavailable. Using demo data. Last checked: ${lastChecked?.toLocaleTimeString()}`,
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
              {statusInfo.icon}
              {statusInfo.text}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="font-medium">API Status</p>
              <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Backend URL: {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        <Button variant="ghost" size="sm" onClick={checkHealth} className="h-6 w-6 p-0">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    </TooltipProvider>
  )
}
