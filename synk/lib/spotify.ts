const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!

if (!SPOTIFY_CLIENT_ID) {
  throw new Error("SPOTIFY_CLIENT_ID is not configured")
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  duration_ms: number
  preview_url: string | null
  external_urls: { spotify: string }
  album: {
    images: { url: string; height: number; width: number }[]
  }
}

export interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[]
  }
}

// Generate Spotify auth URL (works with both localhost and production)
export function getSpotifyAuthUrl(): string {
  const scopes = [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
  ].join(" ")

  // Use the current origin for redirect URI
  const redirectUri = `${window.location.origin}/api/auth/spotify/callback`

  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: redirectUri,
    state: Math.random().toString(36).substring(7),
  })

  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

// Format duration from milliseconds to MM:SS
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
