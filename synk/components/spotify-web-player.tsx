"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
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

export function SpotifyWebPlayer({ accessToken, trackUri, onTrackEnd, isHost }: SpotifyWebPlayerProps) {
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
  const lastTrackUri = useRef<string | null>(null)
  const onTrackEndRef = useRef(onTrackEnd)

  useEffect(() => {
    onTrackEndRef.current = onTrackEnd
  }, [onTrackEnd])

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
        getOAuthToken: (cb: (token: string) => void) => cb(accessToken),
        volume: 0.5,
      })

      spotifyPlayer.addListener("initialization_error", ({ message }: any) => {
        setPlaybackError("Failed to initialize Spotify player")
        toast({ title: "Spotify Player Error", description: message, variant: "destructive" })
      })

      spotifyPlayer.addListener("authentication_error", ({ message }: any) => {
        setPlaybackError("Authentication error")
        toast({ title: "Authentication Error", description: message, variant: "destructive" })
      })

      spotifyPlayer.addListener("account_error", ({ message }: any) => {
        setPlaybackError("Spotify Premium required")
        toast({ title: "Account Error", description: message, variant: "destructive" })
      })

      spotifyPlayer.addListener("ready", async ({ device_id }: any) => {
        setDeviceId(device_id)
        setIsReady(true)
        setIsLoading(false)
        try {
          const vol = await spotifyPlayer.getVolume()
          setVolume(Math.round(vol * 100))
        } catch {}
        toast({ title: "Spotify Player Ready", description: "Full song playback is now available!" })
      })

      spotifyPlayer.addListener("not_ready", () => {
        setIsReady(false)
      })

      spotifyPlayer.addListener("track_end", () => {
        console.log("Track ended naturally, calling onTrackEnd");
        onTrackEndRef.current?.(); //test
      });

      spotifyPlayer.addListener("player_state_changed", (state: any) => {
        if (!state) return;
      
        setCurrentTrack(state.track_window.current_track);
        setIsPlaying(!state.paused);
        setPosition(state.position);
        setDuration(state.duration);
      });

      spotifyPlayer.connect().then((success: boolean) => {
        if (!success) {
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
  }, [accessToken, toast])

  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setPosition((prev) => (prev >= duration ? prev : prev + 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [isPlaying, duration])

  useEffect(() => {
    if (!player || !deviceId || !trackUri || !isReady || !isHost) return
    if (trackUri === lastTrackUri.current) return
    lastTrackUri.current = trackUri
    setPosition(0)

    const playTrack = async () => {
      try {
        setPlaybackError(null)
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: "PUT",
          body: JSON.stringify({ uris: [trackUri] }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          if (response.status === 404) {
            setPlaybackError("Track not available or requires Premium")
          } else {
            setPlaybackError(`Playback error: ${response.status}`)
          }
          toast({
            title: "Playback Error",
            description: "Failed to play track. Try opening in Spotify app.",
            variant: "destructive",
          })
        }
      } catch (error) {
        setPlaybackError("Failed to play track")
        toast({ title: "Playback Error", description: "Failed to play track", variant: "destructive" })
      }
    }

    playTrack()
  }, [trackUri, player, deviceId, accessToken, isReady, isHost, toast])

  const togglePlayback = async () => {
    if (player && isHost) {
      try {
        await player.togglePlay()
      } catch (error) {
        console.error("Error toggling playback:", error)
      }
    }
  }

  const skipTrack = async () => {
    if (isHost) {
      onTrackEndRef.current?.()
    }
  }

  const handleVolumeChange = async (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    try {
      if (player) await player.setVolume(newVolume / 100)
    } catch (error) {
      console.error("Error setting volume:", error)
    }
  }

  const openInSpotify = (spotifyUrl?: string) => {
    if (spotifyUrl) window.open(spotifyUrl, "_blank")
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
                  src={currentTrack.album.images[0].url}
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
              src={currentTrack.album.images[0].url}
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
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                <div
                  className="bg-green-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatTime(position)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div className="flex items-center gap-2">
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

                <div className="flex items-center gap-2 ml-auto">
                  <Volume2 className="h-4 w-4" />
                  <Slider value={[volume]} onValueChange={handleVolumeChange} max={100} step={1} className="w-20" />
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openInSpotify(currentTrack.external_urls?.spotify)}
                >
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
