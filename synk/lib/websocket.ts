export interface WebSocketMessage {
  type: string
  [key: string]: any
}

export interface Song {
  id: string
  title: string
  artist: string
  duration: string
  votes: number
  addedBy: string
  votedBy: string[]
  spotifyUrl?: string
  previewUrl?: string
  imageUrl?: string
  addedAt: string
}

export interface User {
  id: string
  name: string
  isHost: boolean
  joinedAt: string
}

export interface RoomState {
  id: string
  hostId: string
  users: User[]
  queue: Song[]
  currentSong: Song | null
  createdAt: string
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private messageHandlers = new Map<string, (data: any) => void>()
  private connectionHandlers = {
    onOpen: () => {},
    onClose: () => {},
    onError: (error: Event) => {},
  }
  private isConnecting = false
  private shouldReconnect = true
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor(private url: string) {}

  connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return Promise.resolve()
    }

    this.isConnecting = true
    this.shouldReconnect = true

    return new Promise((resolve, reject) => {
      try {
        console.log("🔌 Connecting to WebSocket:", this.url)
        this.ws = new WebSocket(this.url)

        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            console.log("⏰ Connection timeout, closing WebSocket")
            this.ws.close()
            reject(new Error("Connection timeout"))
          }
        }, 10000)

        this.ws.onopen = () => {
          console.log("🔌 WebSocket connected successfully")
          clearTimeout(connectionTimeout)
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.connectionHandlers.onOpen()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)

            // Handle heartbeat silently
            if (message.type === "pong" || message.type === "ping") {
              return
            }

            // Skip logging for certain message types to reduce noise
            if (!["unknown", "heartbeat", "keepalive"].includes(message.type)) {
              console.log("🔄 WebSocket received message:", message.type, message)
            }

            const handler = this.messageHandlers.get(message.type)
            if (handler) {
              handler(message)
            } else {
              // Only log unknown messages that aren't system messages
              if (message.type && !["unknown", "heartbeat", "keepalive", "pong", "ping"].includes(message.type)) {
                console.warn("⚠️ No handler found for message type:", message.type)
              }
            }
          } catch (error) {
            console.error("❌ Error parsing WebSocket message:", error)
          }
        }

        this.ws.onclose = (event) => {
          console.log("🔌 WebSocket disconnected. Code:", event.code, "Reason:", event.reason)
          clearTimeout(connectionTimeout)
          this.isConnecting = false
          this.stopHeartbeat()
          this.connectionHandlers.onClose()

          if (this.shouldReconnect && event.code !== 1000) {
            this.attemptReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error)
          clearTimeout(connectionTimeout)
          this.isConnecting = false
          this.connectionHandlers.onError(error)
          reject(error)
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }))
      }
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.shouldReconnect) {
      this.reconnectAttempts++
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        this.connect().catch(console.error)
      }, this.reconnectDelay * Math.min(this.reconnectAttempts, 5))
    } else {
      console.error("❌ Max reconnection attempts reached")
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      console.log("📤 Sent message:", message.type)
    } else {
      console.error("❌ WebSocket is not connected. ReadyState:", this.ws?.readyState)
    }
  }

  on(messageType: string, handler: (data: any) => void) {
    this.messageHandlers.set(messageType, handler)
  }

  off(messageType: string) {
    this.messageHandlers.delete(messageType)
  }

  onConnection(handlers: {
    onOpen?: () => void
    onClose?: () => void
    onError?: (error: Event) => void
  }) {
    if (handlers.onOpen) this.connectionHandlers.onOpen = handlers.onOpen
    if (handlers.onClose) this.connectionHandlers.onClose = handlers.onClose
    if (handlers.onError) this.connectionHandlers.onError = handlers.onError
  }

  disconnect() {
    this.shouldReconnect = false
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close(1000, "Client disconnect")
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // Room actions
  createRoom(userName: string, roomCode: string) {
    this.send({
      type: "create_room",
      userName,
      roomCode,
    })
  }

  joinRoom(userName: string, roomCode: string) {
    this.send({
      type: "join_room",
      userName,
      roomCode,
    })
  }

  addSong(song: Omit<Song, "id" | "votes" | "addedBy" | "votedBy" | "addedAt">) {
    this.send({
      type: "add_song",
      song,
    })
  }

  voteSong(songId: string) {
    this.send({
      type: "vote_song",
      songId,
    })
  }

  skipSong() {
    this.send({
      type: "skip_song",
    })
  }

  clearQueue() {
    this.send({
      type: "clear_queue",
    })
  }

  getRoomState() {
    this.send({
      type: "get_room_state",
    })
  }

  endRoom() {
    this.send({
      type: "end_room",
    })
  }

  leaveRoom() {
    this.send({
      type: "leave_room",
    })
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"
    console.log("🔌 Creating WebSocket client with URL:", wsUrl)
    wsClient = new WebSocketClient(wsUrl)
  }
  return wsClient
}

export function disconnectWebSocket() {
  if (wsClient) {
    wsClient.disconnect()
    wsClient = null
  }
}
