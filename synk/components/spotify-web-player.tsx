"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipForward, Volume2, Loader2, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SpotifyWebPlayerProps {
  accessToken: string
  trackUri?: string
  onTrackEnd?: () => void
  isHost: boolean
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void
    Spotify: any
  }
}

export function SpotifyWebPlayer({ 
  accessToken, 
  trackUri, 
  onTrackEnd, 
  isHost
}: SpotifyWebPlayerProps) {
  const [player, setPlayer] = useState<any>(null)
  const [deviceId, setDeviceId] = useState<string>("")
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<any>(null)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(50)
  const [isLoading, setIsLoading] = useState(true)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const { toast } = useToast()
  const sdkLoaded = useRef(false)
  const playbackAttempted = useRef(false)
  const lastTrackUri = useRef<string | null>(null)

  // Load Spotify Web Playback SDK
  useEffect(() => {
    if (sdkLoaded.current) return
    sdkLoaded.current = true

    const script = document.createElement("script")
    script.src = "https://sdk.scdn.co/spotify-player.js"
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: "MusicQueue Web Player",
        getOAuthToken: (cb: (token: string) => void) => {
          cb(accessToken)
        },
        volume: 0.5,
      })

      // Error handling
      spotifyPlayer.addListener("initialization_error", ({ message }: any) => {
        console.error("Spotify Player initialization error:", message)
        setPlaybackError("Failed to initialize Spotify player")
        toast({
          title: "Spotify Player Error",
          description: "Failed to initialize Spotify player",
          variant: "destructive",
        })
      })

      spotifyPlayer.addListener("authentication_error", ({ message }: any) => {
        console.error("Spotify Player authentication error:", message)
        setPlaybackError("Authentication error")
        toast({
          title: "Authentication Error",
          description: "Please reconnect to Spotify",
          variant: "destructive",
        })
      })

      spotifyPlayer.addListener("account_error", ({ message }: any) => {
        console.error("Spotify Player account error:", message)
        setPlaybackError("Spotify Premium required")
        toast({
          title: "Account Error",
          description: "Spotify Premium required for full playback",
          variant: "destructive",
        })
      })

      // Ready
      spotifyPlayer.addListener("ready", ({ device_id }: any) => {
        console.log("Spotify Player ready with Device ID:", device_id)
        setDeviceId(device_id)
        setIsReady(true)
        setIsLoading(false)
        toast({
          title: "Spotify Player Ready",
          description: "Full song playback is now available!",
        })
      })

      // Not Ready
      spotifyPlayer.addListener("not_ready", ({ device_id }: any) => {
        console.log("Spotify Player not ready with Device ID:", device_id)
        setIsReady(false)
      })

      // Player state changed
      spotifyPlayer.addListener("player_state_changed", (state: any) => {
        if (!state) return

        setCurrentTrack(state.track_window.current_track)
        setIsPlaying(!state.paused)

        // Always update position when we get a state update
        setPosition(state.position)
        setDuration(state.duration)

        // Check if track ended
        if (state.position === 0 && state.paused && currentTrack) {
          console.log("Track ended, calling onTrackEnd")
          onTrackEnd?.()
        }
      })

      // Connect to the player
      spotifyPlayer.connect().then((success: boolean) => {
        if (success) {
          console.log("Successfully connected to Spotify Player")
        } else {
          console.error("Failed to connect to Spotify Player")
          setPlaybackError("Failed to connect to Spotify")
          setIsLoading(false)
        }
      })

      setPlayer(spotifyPlayer)
    }

    return () => {
      if (player) {
        player.disconnect()
      }
    }
  }, [accessToken, toast, onTrackEnd])

  // Add position timer to update progress bar
  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(() => {
      setPosition((prev) => {
        // Don't exceed duration
        if (prev >= duration) return prev
        return prev + 1000 // Update every second (1000ms)
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isPlaying, duration])

  // Play track when trackUri changes - ONLY FOR HOST
  useEffect(() => {
    if (!player || !deviceId || !trackUri || !isReady || !isHost) return

    // Only attempt playback if track URI has changed
    if (trackUri === lastTrackUri.current) return
    lastTrackUri.current = trackUri

    const playTrack = async () => {
      try {
        console.log("Attempting to play track:", trackUri)
        setPlaybackError(null)

        // Transfer playback to our device and play the track
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: "PUT",
          body: JSON.stringify({
            uris: [trackUri],
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("Error playing track:", response.status, errorData)

          if (response.status === 404) {
            setPlaybackError("Track not available in your region or requires Premium")
          } else {
            setPlaybackError(`Playback error: ${response.status}`)
          }

          toast({
            title: "Playback Error",
            description: "Failed to play track. Try opening in Spotify app.",
            variant: "destructive",
          })
        } else {
          console.log("Successfully started playback")
        }
      } catch (error) {
        console.error("Error playing track:", error)
        setPlaybackError("Failed to play track")
        toast({
          title: "Playback Error",
          description: "Failed to play track",
          variant: "destructive",
        })
      }
    }

    if (isHost) {
      playTrack()
    }
  }, [trackUri, player, deviceId, accessToken, isReady, isHost, toast])

  const togglePlayback = async () => {
    if (!player || !isHost) return

    try {
      await player.togglePlay()
    } catch (error) {
      console.error("Error toggling playback:", error)
    }
  }

  const skipTrack = async () => {
    if (!player || !isHost) return

    try {
      onTrackEnd?.()
    } catch (error) {
      console.error("Error skipping track:", error)
    }
  }

  const handleVolumeChange = async (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)

    if (player) {
      try {
        await player.setVolume(newVolume / 100)
      } catch (error) {
        console.error("Error setting volume:", error)
      }
    }
  }

  const openInSpotify = (spotifyUrl?: string) => {
    if (spotifyUrl) {
      window.open(spotifyUrl, "_blank")
    }
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="p-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading Spotify Player...</p>
        </div>
      </div>
    )
  }

  if (playbackError) {
    return (
      <div className="w-full">
        <div className="p-4 text-center">
          <p className="text-sm text-red-500 mb-3">{playbackError}</p>
          {currentTrack && (
            <div className="flex items-center justify-center gap-3 mb-3">
              {currentTrack.album?.images?.[0] && (
                <img
                  src={currentTrack.album.images[0].url || "/placeholder.svg"}
                  alt={currentTrack.name}
                  className="w-12 h-12 rounded"
                />
              )}
              <div className="text-left">
                <p className="font-medium">{currentTrack.name}</p>
                <p className="text-sm text-gray-600">
                  {currentTrack.artists.map((artist: any) => artist.name).join(", ")}
                </p>
              </div>
            </div>
          )}
          <Button size="sm" onClick={() => openInSpotify(currentTrack?.external_urls?.spotify)} className="mx-auto">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Spotify App
          </Button>
        </div>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="w-full">
        <div className="p-4 text-center">
          <p className="text-sm text-gray-500">Spotify Player not ready. Please check your connection.</p>
        </div>
      </div>
    )
  }

  if (!currentTrack) {
    return (
      <div className="w-full">
        <div className="p-4 text-center text-gray-500">No track selected</div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="p-4">
        <div className="flex items-center gap-4">
          {currentTrack.album?.images?.[0] && (
            <img
              src={currentTrack.album.images[0].url || "/placeholder.svg"}
              alt={currentTrack.name}
              className="w-16 h-16 rounded"
            />
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{currentTrack.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {currentTrack.artists.map((artist: any) => artist.name).join(", ")}
            </p>

            <div className="mt-2 space-y-2">
              {/* Progress bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                <div
                  className="bg-green-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
                />
              </div>

              {/* Time display */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatTime(position)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {/* Only show playback controls for host */}
                {isHost ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={togglePlayback}>
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={skipTrack}>
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">Host controls playback</p>
                )}

                {/* Everyone gets volume control */}
                <div className="flex items-center gap-2 ml-auto">
                  <Volume2 className="h-4 w-4" />
                  <Slider value={[volume]} onValueChange={handleVolumeChange} max={100} step={1} className="w-20" />
                </div>

                {/* Open in Spotify button */}
                <Button size="sm" variant="ghost" onClick={() => openInSpotify(currentTrack.external_urls?.spotify)}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
