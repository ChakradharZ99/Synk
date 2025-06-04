"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

interface SpotifyTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

export function useSpotifyAuth() {
  const [tokens, setTokens] = useState<SpotifyTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Load tokens from localStorage on mount
    const loadTokens = () => {
      const accessToken = localStorage.getItem("spotify_access_token")
      const refreshToken = localStorage.getItem("spotify_refresh_token")
      const expiresAt = localStorage.getItem("spotify_token_expiry")

      if (accessToken && refreshToken && expiresAt) {
        setTokens({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: Number.parseInt(expiresAt),
        })
      }
      setIsLoading(false)
    }

    loadTokens()
  }, [])

  const saveTokens = (tokenData: { access_token: string; refresh_token: string; expires_in: number }) => {
    const expiresAt = Date.now() + tokenData.expires_in * 1000

    localStorage.setItem("spotify_access_token", tokenData.access_token)
    localStorage.setItem("spotify_refresh_token", tokenData.refresh_token)
    localStorage.setItem("spotify_token_expiry", expiresAt.toString())

    setTokens({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
    })
  }

  const refreshTokens = async () => {
    if (!tokens?.refresh_token) {
      throw new Error("No refresh token available")
    }

    try {
      const response = await fetch("/api/spotify/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: tokens.refresh_token,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.error === "invalid_grant") {
          // Clear invalid tokens
          clearTokens()
          throw new Error("Invalid refresh token")
        }
        throw new Error("Failed to refresh token")
      }

      const data = await response.json()
      saveTokens(data)
      return data.access_token
    } catch (error) {
      console.error("Token refresh failed:", error)
      clearTokens()
      throw error
    }
  }

  const getValidAccessToken = async (): Promise<string | null> => {
    if (!tokens) return null

    // Check if token is expired (with 5 minute buffer)
    const isExpired = Date.now() > tokens.expires_at - 5 * 60 * 1000

    if (isExpired) {
      try {
        return await refreshTokens()
      } catch (error) {
        if (error instanceof Error && error.message === "Invalid refresh token") {
          toast({
            title: "Authentication expired",
            description: "Please reconnect to Spotify",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Authentication error",
            description: "Please try reconnecting to Spotify",
            variant: "destructive",
          })
        }
        return null
      }
    }

    return tokens.access_token
  }

  const clearTokens = () => {
    localStorage.removeItem("spotify_access_token")
    localStorage.removeItem("spotify_refresh_token")
    localStorage.removeItem("spotify_token_expiry")
    setTokens(null)
  }

  const isAuthenticated = tokens !== null && Date.now() < tokens.expires_at

  return {
    tokens,
    isAuthenticated,
    isLoading,
    saveTokens,
    getValidAccessToken,
    clearTokens,
  }
}
