"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { ApiError } from "@/lib/api"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} retry={this.retry} />
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.retry} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  const isApiError = error instanceof ApiError

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <span>Something went wrong</span>
        </CardTitle>
        <CardDescription>
          {isApiError ? `API Error (${error.status}): ${error.message}` : error.message}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={retry} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
        {isApiError && error.status === 0 && (
          <p className="text-sm text-gray-600 mt-2">Make sure the FastAPI backend is running on the correct port.</p>
        )}
      </CardContent>
    </Card>
  )
}

// Hook for handling API errors in components
export function useErrorHandler() {
  const handleError = (error: unknown) => {
    if (error instanceof ApiError) {
      console.error("API Error:", error.message, error.details)
      // You could integrate with a toast notification system here
    } else {
      console.error("Unexpected error:", error)
    }
  }

  return { handleError }
}
