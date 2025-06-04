"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Loader2 } from "lucide-react"
import { useSpotifyAuth } from "@/hooks/use-spotify-auth"

export default function SpotifySuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { saveTokens } = useSpotifyAuth()

  useEffect(() => {
    const accessToken = searchParams.get("access_token")
    const refreshToken = searchParams.get("refresh_token")
    const expiresIn = searchParams.get("expires_in")

    if (accessToken && refreshToken && expiresIn) {
      // Save tokens using the hook
      saveTokens({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: Number.parseInt(expiresIn),
      })

      // Redirect back to create room with Spotify auth
      setTimeout(() => {
        router.push("/?spotify_connected=true")
      }, 2000)
    } else {
      // Redirect back with error if tokens are missing
      router.push("/?error=missing_tokens")
    }
  }, [searchParams, router, saveTokens])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle>Spotify Connected!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Successfully connected to Spotify. Redirecting you back...
          </p>
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    </div>
  )
}
