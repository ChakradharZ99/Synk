"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Music,
  Users,
  Search,
  Plus,
  ChevronUp,
  Play,
  Copy,
  Crown,
  ArrowLeft,
  Volume2,
  Loader2,
  WifiOff,
  ExternalLink,
  VolumeX,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDuration, type SpotifyTrack } from "@/lib/spotify"
import { useWebSocket } from "@/hooks/use-websocket"
import { useSpotifyAuth } from "@/hooks/use-spotify-auth"
import type { Song } from "@/lib/websocket"
import { ConnectionStatus } from "@/components/connection-status"
import { RoomStats } from "@/components/room-stats"
import { SpotifyWebPlayer } from "@/components/spotify-web-player"

export default function RoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const roomId = params.roomId as string
  const userName = searchParams.get("name") || ""
  const isHostParam = searchParams.get("host") === "true"

  const {
    isConnected,
    roomState,
    currentUser,
    connectionError,
    isHost,
    hasVoted,
    createRoom,
    joinRoom,
    addSong,
    voteSong,
    skipSong,
    clearQueue,
    endRoom,
    leaveRoom,
  } = useWebSocket()

  const { isAuthenticated, getValidAccessToken, tokens, isLoading } = useSpotifyAuth()

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Song[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [roomWasEstablished, setRoomWasEstablished] = useState(false)
  const joinAttempted = useRef(false)
  const lastSongId = useRef<string | null>(null)

  // Track when room is successfully established
  useEffect(() => {
    if (roomState && hasJoinedRoom && !roomWasEstablished) {
      setRoomWasEstablished(true)
    }
  }, [roomState, hasJoinedRoom, roomWasEstablished])

  // Check if user is authenticated, if not redirect to home (but wait for loading to complete)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && isHostParam) {
      toast({
        title: "Authentication Required",
        description: "Please connect your Spotify account to host a room",
        variant: "destructive",
      })
      router.push("/")
      return
    }
  }, [isAuthenticated, isLoading, router, toast, isHostParam])

  // Check if user has Premium
  useEffect(() => {
    const checkPremium = async () => {
      if (!isAuthenticated || !tokens) return

      try {
        const accessToken = await getValidAccessToken()
        if (!accessToken) return

        const response = await fetch("https://api.spotify.com/v1/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (response.ok) {
          const userData = await response.json()
          setIsPremium(userData.product === "premium")

          // Log premium status for debugging
          console.log("Spotify Premium status:", userData.product === "premium" ? "Premium" : "Free")
        }
      } catch (error) {
        console.error("Error checking Premium status:", error)
      }
    }

    checkPremium()
  }, [isAuthenticated, tokens, getValidAccessToken])

  // Join room only once when connected
  useEffect(() => {
    if (isConnected && !hasJoinedRoom && userName && !joinAttempted.current && (!isHostParam || isAuthenticated)) {
      joinAttempted.current = true

      if (isHostParam) {
        createRoom(userName, roomId)
      } else {
        joinRoom(userName, roomId)
      }
      setHasJoinedRoom(true)
    }
  }, [isConnected, hasJoinedRoom, userName, roomId, isHostParam, createRoom, joinRoom, isAuthenticated])

  // Handle song changes
  useEffect(() => {
    if (roomState?.currentSong?.id !== lastSongId.current) {
      lastSongId.current = roomState?.currentSong?.id || null
    }
  }, [roomState?.currentSong?.id])

  // Redirect to home when room ends or is no longer available
  useEffect(() => {
    // Only redirect if we've successfully established a room before and now it's gone
    if (roomWasEstablished && isConnected && !roomState) {
      const timeoutId = setTimeout(() => {
        // Double-check that we're still in the same state after a brief delay
        if (roomWasEstablished && isConnected && !roomState) {
          toast({
            title: "Room Unavailable", 
            description: "This room is no longer available",
            variant: "destructive",
          })
          router.push("/")
        }
      }, 1000) // Wait 1 second to avoid race conditions

      return () => clearTimeout(timeoutId)
    }
  }, [roomWasEstablished, isConnected, roomState, router, toast])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      setIsSearching(true)
      try {
        const accessToken = await getValidAccessToken()

        const response = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(query)}${accessToken ? `&access_token=${accessToken}` : ""}`,
        )
        const data = await response.json()

        if (data.tracks) {
          const formattedTracks: Song[] = data.tracks.map((track: SpotifyTrack) => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map((a) => a.name).join(", "),
            duration: formatDuration(track.duration_ms),
            votes: 0,
            addedBy: "",
            votedBy: [],
            spotifyUrl: track.external_urls.spotify,
            previewUrl: track.preview_url,
            imageUrl: track.album.images[0]?.url,
            addedAt: new Date().toISOString(),
          }))
          setSearchResults(formattedTracks)
        }
      } catch (error) {
        console.error("Search failed:", error)
        toast({
          title: "Search failed",
          description: "Could not search for songs. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsSearching(false)
      }
    } else {
      setSearchResults([])
    }
  }

  const handleAddSong = (song: Song) => {
    addSong({
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      spotifyUrl: song.spotifyUrl,
      previewUrl: song.previewUrl,
      imageUrl: song.imageUrl,
    })
    setSearchResults([])
    setSearchQuery("")
  }

  const handleVoteSong = (songId: string) => {
    if (!hasVoted(songId)) {
      voteSong(songId)
    }
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId)
    toast({
      title: "Room code copied!",
      description: "Share this code with friends to invite them.",
    })
  }

  const openInSpotify = (spotifyUrl: string) => {
    window.open(spotifyUrl, "_blank")
  }

  const handleEndSession = () => {
    if (isHost) {
      if (confirm("Are you sure you want to end this session? This will permanently close the room for all participants.")) {
        endRoom()
      }
    } else {
      if (confirm("Are you sure you want to leave this session?")) {
        leaveRoom()
        router.push("/")
      }
    }
  }

  // Convert Spotify URL to URI for Web Playback SDK
  const getSpotifyUri = (spotifyUrl: string) => {
    const trackId = spotifyUrl.split("/track/")[1]?.split("?")[0]
    return trackId ? `spotify:track:${trackId}` : undefined
  }

  // Get current track URI
  const currentTrackUri = useMemo(() => {
    if (!roomState?.currentSong?.spotifyUrl) return undefined
    return getSpotifyUri(roomState.currentSong.spotifyUrl)
  }, [roomState?.currentSong?.spotifyUrl])

  // Show loading while authentication state is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 dark:text-gray-300">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Redirect if not authenticated (only after loading is complete)
  if (!isAuthenticated && isHostParam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You need to connect your Spotify account to host music rooms.
            </p>
            <Button onClick={() => router.push("/")}>Go Back to Connect</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <WifiOff className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Connection Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">Could not connect to the music room server.</p>
            <Button onClick={() => router.push("/")}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isConnected || !roomState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <CardTitle>Connecting to Room</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 dark:text-gray-300">{isHostParam ? "Creating room..." : "Joining room..."}</p>
            <Button className="mt-4" variant="outline" onClick={() => router.push("/")}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleEndSession} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              {isHost ? <Crown className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Room {roomId}</h1>
                <ConnectionStatus isConnected={isConnected} />
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                {roomState.users.length} {roomState.users.length === 1 ? "person" : "people"} in room
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyRoomCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </Button>
            <Button variant="destructive" onClick={handleEndSession}>
              {isHost ? "End Session" : "Leave Session"}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Queue Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Now Playing Section */}
            {roomState.currentSong && (
              <Card className="border-2 border-green-200 dark:border-green-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-green-600" />
                    Now Playing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {roomState.currentSong.imageUrl && (
                        <img
                          src={roomState.currentSong.imageUrl || "/placeholder.svg"}
                          alt={roomState.currentSong.title}
                          className="w-16 h-16 rounded"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{roomState.currentSong.title}</h3>
                        <p className="text-gray-600 dark:text-gray-300">{roomState.currentSong.artist}</p>
                        <p className="text-sm text-gray-500">Added by {roomState.currentSong.addedBy}</p>
                        {!isPremium && !isHost && (
                          <p className="text-xs text-orange-500 mt-1">
                            <VolumeX className="h-3 w-3 inline mr-1" />
                            Upgrade to Premium for browser playback
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <Badge variant="secondary">{roomState.currentSong.votes} votes</Badge>
                      <p className="text-sm text-gray-500">{roomState.currentSong.duration}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openInSpotify(roomState.currentSong!.spotifyUrl!)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open in Spotify
                      </Button>
                    </div>
                  </div>

                  {/* Spotify Web Player for Premium host */}
                  {isPremium && isHost && tokens && (
                    <div className="mt-4">
                      <SpotifyWebPlayer
                        accessToken={tokens.access_token}
                        trackUri={currentTrackUri}
                        onTrackEnd={() => {
                          console.log("Track finished playing!");
                          skipSong();
                        }}
                        isHost={isHost}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Search Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Add Songs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Search for songs..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {isSearching && (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Searching Spotify...
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      {searchResults.map((song) => (
                        <div key={song.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {song.imageUrl && (
                              <img
                                src={song.imageUrl || "/placeholder.svg"}
                                alt={song.title}
                                className="w-12 h-12 rounded"
                              />
                            )}
                            <div>
                              <h4 className="font-medium">{song.title}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{song.artist}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{song.duration}</span>
                            <Button size="sm" variant="ghost" onClick={() => openInSpotify(song.spotifyUrl!)}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={() => handleAddSong(song)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Up Next ({roomState.queue.length} songs)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roomState.queue.map((song, index) => (
                    <div key={song.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-gray-500 w-6">#{index + 1}</div>
                        {song.imageUrl && (
                          <img
                            src={song.imageUrl || "/placeholder.svg"}
                            alt={song.title}
                            className="w-10 h-10 rounded"
                          />
                        )}
                        <div>
                          <h4 className="font-medium">{song.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{song.artist}</p>
                          <p className="text-xs text-gray-500">Added by {song.addedBy}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{song.duration}</span>
                        <Button size="sm" variant="ghost" onClick={() => openInSpotify(song.spotifyUrl!)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={hasVoted(song.id) ? "secondary" : "outline"}
                          onClick={() => handleVoteSong(song.id)}
                          disabled={hasVoted(song.id)}
                        >
                          <ChevronUp className="h-4 w-4 mr-1" />
                          {song.votes}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {roomState.queue.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No songs in queue. Add some music to get started!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Room Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Room Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roomState.users.map((user) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{user.name}</p>
                        {user.id === currentUser?.id && <p className="text-xs text-gray-500">You</p>}
                      </div>
                      {user.isHost && <Crown className="h-4 w-4 text-yellow-500" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Room Stats */}
            <RoomStats roomState={roomState} />

            {/* Room Controls */}
            {isHost && (
              <Card>
                <CardHeader>
                  <CardTitle>Host Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" variant="outline" onClick={skipSong}>
                    <Play className="h-4 w-4 mr-2" />
                    Skip Current Song
                  </Button>
                  <Button className="w-full" variant="outline" onClick={clearQueue}>
                    Clear Queue
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
