import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Room } from './Room.js';
import { 
  WebSocketMessage, 
  CreateRoomMessage, 
  JoinRoomMessage, 
  AddSongMessage, 
  VoteSongMessage,
  SkipSongMessage,
  ClearQueueMessage,
  GetRoomStateMessage,
  EndRoomMessage,
  LeaveRoomMessage
} from './types.js';

export class WebSocketHandler {
  private rooms: Map<string, Room>;
  private userConnections: Map<string, WebSocket>;

  constructor() {
    this.rooms = new Map();
    this.userConnections = new Map();
  }

  handleConnection(ws: WebSocket): void {
    let userId: string | null = null;
    let roomId: string | null = null;

    console.log('New WebSocket connection');

    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        console.log('Received message:', message.type, message);

        switch (message.type) {
          case 'join_room':
            this.handleJoinRoom(ws, message as JoinRoomMessage, (uid, rid) => {
              userId = uid;
              roomId = rid;
            });
            break;
          
          case 'create_room':
            this.handleCreateRoom(ws, message as CreateRoomMessage, (uid, rid) => {
              userId = uid;
              roomId = rid;
            });
            break;
          
          case 'add_song':
            if (userId && roomId) {
              this.handleAddSong(message as AddSongMessage, userId, roomId);
            }
            break;
          
          case 'vote_song':
            if (userId && roomId) {
              this.handleVoteSong(ws, message as VoteSongMessage, userId, roomId);
            }
            break;
          
          case 'skip_song':
            if (userId && roomId) {
              this.handleSkipSong(ws, message as SkipSongMessage, userId, roomId);
            }
            break;
          
          case 'clear_queue':
            if (userId && roomId) {
              this.handleClearQueue(ws, message as ClearQueueMessage, userId, roomId);
            }
            break;
          
          case 'get_room_state':
            if (userId && roomId) {
              this.handleGetRoomState(ws, message as GetRoomStateMessage, roomId);
            }
            break;
          
          case 'end_room':
            if (userId && roomId) {
              this.handleEndRoom(ws, message as EndRoomMessage, roomId);
            }
            break;
          
          case 'leave_room':
            if (userId && roomId) {
              this.handleLeaveRoom(ws, message as LeaveRoomMessage, userId, roomId);
            }
            break;
          
          case 'ping':
            // Handle heartbeat ping
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          
          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type'
            }));
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
      if (userId && roomId) {
        console.log(`🔌 Connection closed for user ${userId} in room ${roomId}`);
        this.handleUserLeave(userId, roomId);
      } else {
        console.log('🔌 Connection closed before user was assigned to a room');
      }
    });
  }

  private handleCreateRoom(
    ws: WebSocket, 
    message: CreateRoomMessage, 
    setIds: (userId: string, roomId: string) => void
  ): void {
    const { userName, roomCode } = message;
    const userId = uuidv4();
    const roomId = roomCode;

    // Check if room already exists
    if (this.rooms.has(roomId)) {
      console.log(`⚠️ Room ${roomId} already exists`);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Room already exists'
      }));
      return;
    }

    // Create new room
    const room = new Room(roomId, userId, userName);
    this.rooms.set(roomId, room);
    this.userConnections.set(userId, ws);

    setIds(userId, roomId);

    console.log(`✅ Room ${roomId} created by ${userName} (userId: ${userId})`);
    console.log(`📊 Current server stats: ${this.rooms.size} rooms, ${this.userConnections.size} users`);

    ws.send(JSON.stringify({
      type: 'room_created',
      roomId,
      userId,
      room: room.toJSON()
    }));
  }

  private handleJoinRoom(
    ws: WebSocket, 
    message: JoinRoomMessage, 
    setIds: (userId: string, roomId: string) => void
  ): void {
    const { userName, roomCode } = message;
    const room = this.rooms.get(roomCode);

    if (!room) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Room not found'
      }));
      return;
    }

    const userId = uuidv4();
    const roomId = roomCode;

    // Add user to room
    room.addUser(userId, userName);
    this.userConnections.set(userId, ws);

    setIds(userId, roomId);

    console.log(`${userName} joined room ${roomId}`);

    // Send room state to new user
    ws.send(JSON.stringify({
      type: 'room_joined',
      roomId,
      userId,
      room: room.toJSON()
    }));

    // Broadcast user joined to others
    this.broadcastToRoom(roomId, {
      type: 'user_joined',
      user: room.users.get(userId),
      room: room.toJSON()
    }, userId);
  }

  private handleAddSong(message: AddSongMessage, userId: string, roomId: string): void {
    const { song } = message;
    const room = this.rooms.get(roomId);

    if (!room) {
      return;
    }

    const user = room.users.get(userId);
    if (!user) return;

    const addedSong = room.addSong(song, user.name);

    console.log(`${user.name} added song: ${song.title}`);

    // Broadcast song added to all users
    this.broadcastToRoom(roomId, {
      type: 'song_added',
      song: {
        ...addedSong,
        votedBy: Array.from(addedSong.votedBy)
      },
      room: room.toJSON()
    });
  }

  private handleVoteSong(ws: WebSocket, message: VoteSongMessage, userId: string, roomId: string): void {
    const { songId } = message;
    const room = this.rooms.get(roomId);

    if (!room) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Room not found'
      }));
      return;
    }

    const success = room.voteSong(songId, userId);
    
    if (success) {
      const user = room.users.get(userId);
      console.log(`${user?.name} voted for song ${songId}`);

      // Broadcast vote to all users
      this.broadcastToRoom(roomId, {
        type: 'song_voted',
        songId,
        userId,
        room: room.toJSON()
      });
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Already voted for this song'
      }));
    }
  }

  private handleSkipSong(ws: WebSocket, message: SkipSongMessage, userId: string, roomId: string): void {
    const room = this.rooms.get(roomId);

    if (!room || room.hostId !== userId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Only host can skip songs'
      }));
      return;
    }

    const skippedSong = room.skipCurrentSong();
    
    if (skippedSong) {
      console.log(`Host skipped song: ${skippedSong.title}`);

      this.broadcastToRoom(roomId, {
        type: 'song_skipped',
        skippedSong: {
          ...skippedSong,
          votedBy: Array.from(skippedSong.votedBy)
        },
        room: room.toJSON()
      });
    }
  }

  private handleClearQueue(ws: WebSocket, message: ClearQueueMessage, userId: string, roomId: string): void {
    const room = this.rooms.get(roomId);

    if (!room || room.hostId !== userId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Only host can clear queue'
      }));
      return;
    }

    room.clearQueue();
    console.log('Host cleared the queue');

    this.broadcastToRoom(roomId, {
      type: 'queue_cleared',
      room: room.toJSON()
    });
  }

  private handleGetRoomState(ws: WebSocket, message: GetRoomStateMessage, roomId: string): void {
    const room = this.rooms.get(roomId);

    if (!room) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Room not found'
      }));
      return;
    }

    ws.send(JSON.stringify({
      type: 'room_state',
      room: room.toJSON()
    }));
  }

  private handleEndRoom(ws: WebSocket, message: EndRoomMessage, roomId: string): void {
    const room = this.rooms.get(roomId);
    const userId = Array.from(this.userConnections.entries())
      .find(([_, ws_conn]) => ws_conn === ws)?.[0];

    if (!room || !userId || room.hostId !== userId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Only host can end the room'
      }));
      return;
    }

    console.log(`Host ended room ${roomId}`);

    // Notify all users that the room has ended
    this.broadcastToRoom(roomId, {
      type: 'room_ended',
      message: 'Host has ended the session'
    });

    // Remove all connections and delete the room
    room.users.forEach(user => {
      this.userConnections.delete(user.id);
    });
    this.rooms.delete(roomId);
  }

  private handleLeaveRoom(ws: WebSocket, message: LeaveRoomMessage, userId: string, roomId: string): void {
    // For non-hosts, this is just a regular leave
    this.handleUserLeave(userId, roomId);
  }

  private handleUserLeave(userId: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`⚠️ Attempted to remove user ${userId} from non-existent room ${roomId}`);
      return;
    }

    const user = room.users.get(userId);
    const wasHost = user?.isHost || false;
    const result = room.removeUser(userId);
    this.userConnections.delete(userId);

    console.log(`👋 ${user?.name || 'Unknown user'} left room ${roomId} (${wasHost ? 'was host' : 'was participant'})`);
    console.log(`📊 Room ${roomId} now has ${room.users.size} users`);

    if (room.users.size === 0) {
      // Delete empty room
      this.rooms.delete(roomId);
      console.log(`🗑️ Room ${roomId} deleted (empty). Total rooms: ${this.rooms.size}`);
    } else {
      // Broadcast user left
      this.broadcastToRoom(roomId, {
        type: 'user_left',
        userId,
        userName: user?.name,
        newHost: result.newHost,
        room: room.toJSON()
      });
      
      if (result.newHost) {
        console.log(`👑 New host assigned in room ${roomId}: ${result.newHost}`);
      }
    }
  }

  private broadcastToRoom(roomId: string, message: any, excludeUserId?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.users.forEach(user => {
      if (user.id !== excludeUserId) {
        const ws = this.userConnections.get(user.id);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      }
    });
  }

  // Cleanup methods
  getRoomsCount(): number {
    return this.rooms.size;
  }

  getUsersCount(): number {
    return this.userConnections.size;
  }

  cleanupEmptyRooms(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.users.size === 0 && room.createdAt < oneHourAgo) {
        this.rooms.delete(roomId);
        console.log(`🧹 Cleaned up empty room: ${roomId}`);
      }
    }
  }

  shutdown(): void {
    console.log('\n🛑 Shutting down server...');
    
    // Notify all connected users
    this.userConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'server_shutdown',
          message: 'Server is shutting down'
        }));
        ws.close();
      }
    });
  }
}