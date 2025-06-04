"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { getWebSocketClient, type RoomState, type Song, type User } from "@/lib/websocket"
import { useToast } from "@/hooks/use-toast"

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const wsClient = useRef(getWebSocketClient())
  const { toast } = useToast()
  const handlersSetup = useRef(false)
  const connectionAttempted = useRef(false)

  // Set up message handlers BEFORE connecting
  const setupMessageHandlers = useCallback(() => {
    if (handlersSetup.current) return

    const client = wsClient.current
    console.log("🔌 Setting up WebSocket message handlers")

    // Message handlers with detailed logging
    client.on("room_created", (data) => {
      console.log("📨 Received room_created:", data)
      setRoomState(data.room)
      setCurrentUser({ id: data.userId, name: data.room.users.find((u: User) => u.id === data.userId)?.name || "" })
      toast({
        title: "Room Created!",
        description: `Room ${data.roomId} is ready`,
      })
    })

    client.on("room_joined", (data) => {
      console.log("📨 Received room_joined:", data)
      setRoomState(data.room)
      setCurrentUser({ id: data.userId, name: data.room.users.find((u: User) => u.id === data.userId)?.name || "" })
      toast({
        title: "Joined Room!",
        description: `Welcome to room ${data.roomId}`,
      })
    })

    client.on("user_joined", (data) => {
      console.log("📨 Received user_joined:", data)
      setRoomState(data.room)
      toast({
        title: "User Joined",
        description: `${data.user.name} joined the room`,
      })
    })

    client.on("user_left", (data) => {
      console.log("📨 Received user_left:", data)
      setRoomState(data.room)
      toast({
        title: "User Left",
        description: `${data.userName} left the room`,
      })

      if (data.newHost && currentUser?.id === data.newHost) {
        toast({
          title: "You're now the host!",
          description: "You can now control playback and manage the queue",
        })
      }
    })

    client.on("song_added", (data) => {
      console.log("📨 Received song_added:", data)
      setRoomState(data.room)
      toast({
        title: "Song Added",
        description: `"${data.song.title}" added to queue`,
      })
    })

    client.on("song_voted", (data) => {
      console.log("📨 Received song_voted:", data)
      setRoomState(data.room)
    })

    client.on("song_skipped", (data) => {
      console.log("📨 Received song_skipped:", data)
      setRoomState(data.room)
      toast({
        title: "Song Skipped",
        description: `"${data.skippedSong.title}" was skipped`,
      })
    })

    client.on("queue_cleared", (data) => {
      console.log("📨 Received queue_cleared:", data)
      setRoomState(data.room)
      toast({
        title: "Queue Cleared",
        description: "The host cleared the queue",
      })
    })

    client.on("room_state", (data) => {
      console.log("📨 Received room_state:", data)
      setRoomState(data.room)
    })

    client.on("error", (data) => {
      console.log("📨 Received error:", data)
      // Only show error toasts for meaningful errors, not "Unknown message type"
      if (data.message && !data.message.includes("Unknown message type")) {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        })
      }
    })

    client.on("server_shutdown", (data) => {
      console.log("📨 Received server_shutdown:", data)
      toast({
        title: "Server Maintenance",
        description: data.message,
        variant: "destructive",
      })
    })

    client.on("room_ended", (data) => {
      console.log("📨 Received room_ended:", data)
      toast({
        title: "Session Ended",
        description: data.message || "The host has ended the session",
        variant: "destructive",
      })
      // Clear room state and redirect
      setRoomState(null)
      setCurrentUser(null)
      // The redirect will be handled by the component
    })

    handlersSetup.current = true
  }, [toast]) // Remove currentUser from dependencies to avoid infinite loop

  useEffect(() => {
    if (connectionAttempted.current) return
    connectionAttempted.current = true

    const client = wsClient.current

    // Set up handlers FIRST
    setupMessageHandlers()

    // Connection handlers
    client.onConnection({
      onOpen: () => {
        setIsConnected(true)
        setIsConnecting(false)
        setConnectionError(null)
        console.log("🔌 WebSocket connection opened")
      },
      onClose: () => {
        setIsConnected(false)
        setIsConnecting(false)
        console.log("🔌 WebSocket connection closed")
      },
      onError: (error) => {
        setConnectionError("Connection failed")
        setIsConnecting(false)
        console.log("🔌 WebSocket connection error:", error)
      },
    })

    // Connect to WebSocket AFTER handlers are set up
    setIsConnecting(true)
    client.connect().catch((error) => {
      console.error("Failed to connect to WebSocket:", error)
      setConnectionError("Failed to connect")
      setIsConnecting(false)
    })

    return () => {
      console.log("🔌 Component unmounting, keeping connection alive")
    }
  }, [setupMessageHandlers])

  const createRoom = useCallback((userName: string, roomCode: string) => {
    console.log("🏠 Creating room:", { userName, roomCode })
    wsClient.current.createRoom(userName, roomCode)
  }, [])

  const joinRoom = useCallback((userName: string, roomCode: string) => {
    console.log("🚪 Joining room:", { userName, roomCode })
    wsClient.current.joinRoom(userName, roomCode)
  }, [])

  const addSong = useCallback((song: Omit<Song, "id" | "votes" | "addedBy" | "votedBy" | "addedAt">) => {
    console.log("🎵 Adding song:", song)
    wsClient.current.addSong(song)
  }, [])

  const voteSong = useCallback((songId: string) => {
    console.log("👍 Voting for song:", songId)
    wsClient.current.voteSong(songId)
  }, [])

  const skipSong = useCallback(() => {
    console.log("⏭️ Skipping song")
    wsClient.current.skipSong()
  }, [])

  const clearQueue = useCallback(() => {
    console.log("🗑️ Clearing queue")
    wsClient.current.clearQueue()
  }, [])

  const endRoom = useCallback(() => {
    console.log("🛑 Ending room")
    wsClient.current.endRoom()
  }, [])

  const leaveRoom = useCallback(() => {
    console.log("🚪 Leaving room")
    wsClient.current.leaveRoom()
  }, [])

  const isHost = currentUser && roomState ? roomState.hostId === currentUser.id : false
  const hasVoted = useCallback(
    (songId: string) => {
      if (!currentUser) return false
      const song = roomState?.queue.find((s) => s.id === songId)
      return song?.votedBy.includes(currentUser.id) || false
    },
    [currentUser, roomState?.queue],
  )

  return {
    isConnected,
    isConnecting,
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
  }
}
