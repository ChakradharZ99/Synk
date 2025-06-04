"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Music, Users, Clock, Trophy } from "lucide-react"
import type { RoomState } from "@/lib/websocket"

interface RoomStatsProps {
  roomState: RoomState
}

export function RoomStats({ roomState }: RoomStatsProps) {
  const totalVotes = roomState.queue.reduce((sum, song) => sum + song.votes, 0)
  const topSong = roomState.queue.length > 0 ? roomState.queue[0] : null
  const roomAge = new Date().getTime() - new Date(roomState.createdAt).getTime()
  const roomAgeMinutes = Math.floor(roomAge / (1000 * 60))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Room Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Members</span>
          </div>
          <Badge variant="secondary">{roomState.users.length}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-green-500" />
            <span className="text-sm">Songs</span>
          </div>
          <Badge variant="secondary">{roomState.queue.length}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">Total Votes</span>
          </div>
          <Badge variant="secondary">{totalVotes}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-500" />
            <span className="text-sm">Room Age</span>
          </div>
          <Badge variant="secondary">{roomAgeMinutes}m</Badge>
        </div>

        {topSong && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 mb-1">Most Voted Song</p>
            <p className="text-sm font-medium truncate">{topSong.title}</p>
            <p className="text-xs text-gray-600 truncate">{topSong.artist}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
