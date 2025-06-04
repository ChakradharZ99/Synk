"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipForward, Volume2 } from "lucide-react"

interface SpotifyPlayerProps {
  accessToken: string
  currentTrack?: {
    id: string
    title: string
    artist: string
    imageUrl?: string
    previewUrl?: string
  }
  onTrackEnd?: () => void
}

export function SpotifyPlayer({ accessToken, currentTrack, onTrackEnd }: SpotifyPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(50)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (currentTrack?.previewUrl) {
      if (audioRef.current) {
        audioRef.current.pause()
      }

      audioRef.current = new Audio(currentTrack.previewUrl)
      audioRef.current.volume = volume / 100

      audioRef.current.addEventListener("timeupdate", () => {
        if (audioRef.current) {
          const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100
          setProgress(progress)
        }
      })

      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false)
        setProgress(0)
        onTrackEnd?.()
      })
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [currentTrack, volume, onTrackEnd])

  const togglePlayback = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100
    }
  }

  const skipTrack = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = audioRef.current.duration
    }
  }

  if (!currentTrack) {
    return (
      <Card className="w-full">
        <CardContent className="p-4 text-center text-gray-500">No track selected</CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {currentTrack.imageUrl && (
            <img
              src={currentTrack.imageUrl || "/placeholder.svg"}
              alt={currentTrack.title}
              className="w-16 h-16 rounded"
            />
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{currentTrack.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{currentTrack.artist}</p>

            <div className="mt-2 space-y-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                <div
                  className="bg-green-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={togglePlayback}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                <Button size="sm" variant="ghost" onClick={skipTrack}>
                  <SkipForward className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2 ml-auto">
                  <Volume2 className="h-4 w-4" />
                  <Slider value={[volume]} onValueChange={handleVolumeChange} max={100} step={1} className="w-20" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {!currentTrack.previewUrl && (
          <p className="text-xs text-gray-500 mt-2">Preview not available - Full playback requires Spotify Premium</p>
        )}
      </CardContent>
    </Card>
  )
}
