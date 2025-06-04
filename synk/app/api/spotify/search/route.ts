import { type NextRequest, NextResponse } from "next/server"

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!

// Get client credentials token for public search (server-side only)
async function getClientCredentialsToken(): Promise<string> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  })

  const data = await response.json()
  return data.access_token
}

// Search for tracks using server-side credentials
async function searchSpotifyTracks(query: string, userAccessToken?: string) {
  try {
    // Use user token if available, otherwise use client credentials
    const accessToken = userAccessToken || (await getClientCredentialsToken())

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`)
    }

    const data = await response.json()
    return data.tracks.items
  } catch (error) {
    console.error("Spotify search error:", error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const userAccessToken = searchParams.get("access_token")

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
  }

  try {
    const tracks = await searchSpotifyTracks(query, userAccessToken || undefined)
    return NextResponse.json({ tracks })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Failed to search tracks" }, { status: 500 })
  }
}
