import { type NextRequest, NextResponse } from "next/server"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!

async function getSpotifyAccessToken(code: string, redirectUri: string) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  })

  return response.json()
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const state = searchParams.get("state")

  // Debug headers
  console.log("🔍 Headers:")
  console.log("  - host:", request.headers.get("host"))
  console.log("  - x-forwarded-host:", request.headers.get("x-forwarded-host"))
  console.log("  - x-forwarded-proto:", request.headers.get("x-forwarded-proto"))
  console.log("  - origin:", request.headers.get("origin"))
  console.log("  - referer:", request.headers.get("referer"))

  // Use x-forwarded-host and x-forwarded-proto for the correct origin
  const forwardedHost = request.headers.get("x-forwarded-host")
  const forwardedProto = request.headers.get("x-forwarded-proto")
  const correctOrigin = forwardedHost && forwardedProto 
    ? `${forwardedProto}://${forwardedHost}`
    : APP_URL

  console.log("🔍 Detected origin:", correctOrigin)
  console.log("🔍 Request nextUrl origin:", request.nextUrl.origin)

  console.log("Spotify callback received:", { code: !!code, error, state })

  if (error) {
    console.error("Spotify auth error:", error)
    return NextResponse.redirect(new URL(`/?error=spotify_auth_failed&details=${error}`, correctOrigin))
  }

  if (!code) {
    console.error("No authorization code received")
    return NextResponse.redirect(new URL("/?error=no_code", correctOrigin))
  }

  try {
    // Use the correct origin for redirect URI
    const redirectUri = `${correctOrigin}/api/auth/spotify/callback`
    console.log("🔍 Using redirect URI for token exchange:", redirectUri)

    const tokenData = await getSpotifyAccessToken(code, redirectUri)

    console.log("Token exchange result:", { success: !tokenData.error })

    if (tokenData.error) {
      console.error("Token exchange failed:", tokenData.error, tokenData.error_description)
      return NextResponse.redirect(new URL(`/?error=token_failed&details=${tokenData.error}`, correctOrigin))
    }

    console.log("🔍 Redirecting to origin:", correctOrigin)

    // Store user info as well
    const redirectUrl = new URL("/spotify-success", correctOrigin)
    redirectUrl.searchParams.set("access_token", tokenData.access_token)
    redirectUrl.searchParams.set("refresh_token", tokenData.refresh_token)
    redirectUrl.searchParams.set("expires_in", tokenData.expires_in.toString())

    console.log("🔍 Final redirect URL:", redirectUrl.toString())

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("Spotify auth error:", error)
    return NextResponse.redirect(new URL("/?error=auth_failed", correctOrigin))
  }
}
