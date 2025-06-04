"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Volume2, VolumeX, Info } from "lucide-react"

interface ListeningStatusProps {
  isSpotifyConnected: boolean
  isHost: boolean
  isPremium: boolean
}

export function ListeningStatus({ isSpotifyConnected, isHost, isPremium }: ListeningStatusProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Info className="h-4 w-4" />
          Listening Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSpotifyConnected ? (
              <Volume2 className="h-4 w-4 text-green-500" />
            ) : (
              <VolumeX className="h-4 w-4 text-orange-500" />
            )}
            <span className="text-sm">{isSpotifyConnected ? "Full playback enabled" : "Limited playback"}</span>
          </div>
          <Badge variant={isSpotifyConnected ? "default" : "outline"}>{isSpotifyConnected ? "Premium" : "Basic"}</Badge>
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2 pt-2 border-t">
          {isSpotifyConnected ? (
            <>
              <p>• You can hear full songs through this browser</p>
              <p>• Music is synchronized with the room</p>
              {isHost && <p>• As host, you control playback for everyone</p>}
            </>
          ) : (
            <>
              <p>• Only Spotify Premium users who are signed in can hear full songs</p>
              <p>• Connect Spotify Premium on the home page to enable full playback</p>
              <p>• You can still add songs and vote even without Premium</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
