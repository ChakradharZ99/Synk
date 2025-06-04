export interface User {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: Date;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  votes: number;
  addedBy: string;
  votedBy: Set<string>;
  addedAt: Date;
  spotifyUrl?: string;
  previewUrl?: string;
  imageUrl?: string;
}

export interface SongJSON {
  id: string;
  title: string;
  artist: string;
  duration: string;
  votes: number;
  addedBy: string;
  votedBy: string[];
  addedAt: Date;
  spotifyUrl?: string;
  previewUrl?: string;
  imageUrl?: string;
}

export interface RoomJSON {
  id: string;
  hostId: string;
  users: User[];
  queue: SongJSON[];
  currentSong: SongJSON | null;
  createdAt: Date;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface CreateRoomMessage extends WebSocketMessage {
  type: 'create_room';
  userName: string;
  roomCode: string;
}

export interface JoinRoomMessage extends WebSocketMessage {
  type: 'join_room';
  userName: string;
  roomCode: string;
}

export interface AddSongMessage extends WebSocketMessage {
  type: 'add_song';
  song: Omit<Song, 'id' | 'votes' | 'addedBy' | 'votedBy' | 'addedAt'>;
}

export interface VoteSongMessage extends WebSocketMessage {
  type: 'vote_song';
  songId: string;
}

export interface SkipSongMessage extends WebSocketMessage {
  type: 'skip_song';
}

export interface ClearQueueMessage extends WebSocketMessage {
  type: 'clear_queue';
}

export interface GetRoomStateMessage extends WebSocketMessage {
  type: 'get_room_state';
}

export interface PingMessage extends WebSocketMessage {
  type: 'ping';
}

export interface PongMessage extends WebSocketMessage {
  type: 'pong';
}