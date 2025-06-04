"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Globe, Shield } from "lucide-react"

export function SetupInstructions() {
  const currentUrl = typeof window !== "undefined" ? window.location.origin : ""
  const redirectUri = `${currentUrl}/api/auth/spotify/callback`

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Spotify Setup Instructions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">For Local Development:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              Install ngrok:{" "}
              <a
                href="https://ngrok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                ngrok.com <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              Run:{" "}
              <Badge variant="secondary" className="font-mono">
                ngrok http 3000
              </Badge>
            </li>
            <li>Copy the HTTPS URL (e.g., https://abc123.ngrok.io)</li>
            <li>
              Add to Spotify app redirect URIs:
              <Badge variant="outline" className="font-mono ml-2">
                https://your-ngrok-url.ngrok.io/api/auth/spotify/callback
              </Badge>
            </li>
          </ol>
        </div>

        <div>
          <h3 className="font-semibold mb-2">For Production:</h3>
          <p className="text-sm">Add this redirect URI to your Spotify app:</p>
          <Badge variant="outline" className="font-mono">
            {redirectUri}
          </Badge>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <Globe className="h-4 w-4 inline mr-1" />
            Spotify requires HTTPS for redirect URIs. Use ngrok for local HTTPS testing.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
