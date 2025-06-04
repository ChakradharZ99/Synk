"use client"

import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Loader2 } from "lucide-react"

interface ConnectionStatusProps {
  isConnected: boolean
  isConnecting?: boolean
  className?: string
}

export function ConnectionStatus({ isConnected, isConnecting = false, className = "" }: ConnectionStatusProps) {
  if (isConnecting) {
    return (
      <Badge variant="secondary" className={`flex items-center gap-1 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Connecting...
      </Badge>
    )
  }

  return (
    <Badge variant={isConnected ? "default" : "destructive"} className={`flex items-center gap-1 ${className}`}>
      {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {isConnected ? "Connected" : "Disconnected"}
    </Badge>
  )
}
