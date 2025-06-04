"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Music, Users, Headphones, CheckCircle, AlertCircle } from "lucide-react"
import { getSpotifyAuthUrl } from "@/lib/spotify"
import { useSpotifyAuth } from "@/hooks/use-spotify-auth"
import { useToast } from "@/hooks/use-toast"
import { SetupInstructions } from "@/components/setup-instructions"

export default function HomePage() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState("")
  const [hostName, setHostName] = useState("")
  const [joinName, setJoinName] = useState("")
  const { isAuthenticated, saveTokens, clearTokens } = useSpotifyAuth()
  const { toast } = useToast()

  useEffect(() => {
    // Check for errors in URL
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get("error")
    const details = urlParams.get("details")

    if (error) {
      if (error === "spotify_auth_failed" || error === "token_failed") {
        // Clear any invalid tokens
        clearTokens()
        toast({
          title: "Spotify Setup Required",
          description: "Please check the setup instructions below",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Authentication Error",
          description: details || "Failed to connect to Spotify",
          variant: "destructive",
        })
      }
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    // Check if user just connected Spotify
    if (urlParams.get("spotify_connected")) {
      toast({
        title: "Spotify Connected!",
        description: "You can now create rooms with music playback.",
      })
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [toast])

  const handleHostRoom = () => {
    if (hostName.trim()) {
      if (!isAuthenticated) {
        try {
          // Redirect to Spotify auth
          window.location.href = getSpotifyAuthUrl()
        } catch (error) {
          toast({
            title: "Setup Required",
            description: "Please check the Spotify setup instructions",
            variant: "destructive",
          })
        }
        return
      }

      const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      router.push(`/room/${newRoomCode}?host=true&name=${encodeURIComponent(hostName)}&spotify=true`)
    }
  }

  const handleJoinRoom = () => {
    if (roomCode.trim() && joinName.trim()) {
      router.push(`/room/${roomCode.toUpperCase()}?name=${encodeURIComponent(joinName)}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <Music className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Synk</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Create collaborative music rooms where everyone can add songs and vote for their favorites. The most voted
            songs play next!
          </p>
        </div>

        {/* {showSetupInstructions && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <span className="text-orange-700 dark:text-orange-300 font-medium">Spotify Setup Required</span>
            </div>
            <SetupInstructions />
          </div>
        )} */}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Host Room Card */}
          <Card className="border-2 hover:border-purple-200 dark:hover:border-purple-700 transition-colors">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <Headphones className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-2xl">Host a Room</CardTitle>
              <CardDescription>Create a new music room and invite friends to join</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="host-name">Your Name</Label>
                <Input
                  id="host-name"
                  placeholder="Enter your name"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                />
              </div>
              <Button
                onClick={handleHostRoom}
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={!hostName.trim()}
              >
                {isAuthenticated ? "Create Room" : "Connect Spotify & Create Room"}
              </Button>
              {isAuthenticated ? (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Spotify Connected (Premium required for full playback)
                </div>
              ) : (
                <div className="text-xs text-gray-500 mt-2">Spotify Premium required for full song playback</div>
              )}
            </CardContent>
          </Card>

          {/* Join Room Card */}
          <Card className="border-2 hover:border-blue-200 dark:hover:border-blue-700 transition-colors">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl">Join a Room</CardTitle>
              <CardDescription>Enter a room code to join an existing music session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-code">Room Code</Label>
                <Input
                  id="room-code"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-name">Your Name</Label>
                <Input
                  id="join-name"
                  placeholder="Enter your name"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                />
              </div>
              <Button
                onClick={handleJoinRoom}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!roomCode.trim() || !joinName.trim()}
              >
                Join Room
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full w-fit mx-auto mb-4">
              <Music className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Add Songs</h3>
            <p className="text-gray-600 dark:text-gray-300">Search and add your favorite songs to the queue</p>
          </div>
          <div className="text-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full w-fit mx-auto mb-4">
              <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Vote Together</h3>
            <p className="text-gray-600 dark:text-gray-300">Everyone can upvote songs to influence the play order</p>
          </div>
          <div className="text-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full w-fit mx-auto mb-4">
              <Headphones className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Real-time Sync</h3>
            <p className="text-gray-600 dark:text-gray-300">All changes sync instantly across all connected devices</p>
          </div>
        </div>

        {/* <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => setShowSetupInstructions(!showSetupInstructions)}>
            {showSetupInstructions ? "Hide" : "Show"} Setup Instructions
          </Button>
        </div> */}
      </div>
    </div>
  )
}