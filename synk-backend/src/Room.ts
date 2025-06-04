import { v4 as uuidv4 } from 'uuid';
import { User, Song, SongJSON, RoomJSON } from './types.js';

export class Room {
  public id: string;
  public hostId: string;
  public users: Map<string, User>;
  public queue: Song[];
  public currentSong: Song | null;
  public createdAt: Date;

  constructor(id: string, hostId: string, hostName: string) {
    this.id = id;
    this.hostId = hostId;
    this.users = new Map();
    this.queue = [];
    this.currentSong = null;
    this.createdAt = new Date();
    
    // Add host as first user
    this.users.set(hostId, {
      id: hostId,
      name: hostName,
      isHost: true,
      joinedAt: new Date()
    });
  }

  addUser(userId: string, userName: string): void {
    this.users.set(userId, {
      id: userId,
      name: userName,
      isHost: false,
      joinedAt: new Date()
    });
  }

  removeUser(userId: string): { newHost: string | null } {
    this.users.delete(userId);
    
    // If host leaves, assign new host or close room
    if (userId === this.hostId && this.users.size > 0) {
      const newHost = Array.from(this.users.values())[0];
      newHost.isHost = true;
      this.hostId = newHost.id;
      return { newHost: newHost.id };
    }
    
    return { newHost: null };
  }

  addSong(song: Omit<Song, 'id' | 'votes' | 'addedBy' | 'votedBy' | 'addedAt'>, addedBy: string): Song {
    const newSong: Song = {
      id: uuidv4(),
      ...song,
      addedBy,
      votes: 0,
      votedBy: new Set(),
      addedAt: new Date()
    };
    
    // If there's no current song, set this as the current song
    if (!this.currentSong) {
      this.currentSong = newSong;
    } else {
      // Otherwise add it to the queue
      this.queue.push(newSong);
      this.sortQueue();
    }
    
    return newSong;
  }

  voteSong(songId: string, userId: string): boolean {
    const song = this.queue.find(s => s.id === songId);
    if (!song || song.votedBy.has(userId)) {
      return false;
    }
    
    song.votes++;
    song.votedBy.add(userId);
    this.sortQueue();
    return true;
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Sort by votes (descending), then by added time (ascending)
      if (b.votes !== a.votes) {
        return b.votes - a.votes;
      }
      return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
    });
  }

  removeSong(songId: string): Song | null {
    const index = this.queue.findIndex(s => s.id === songId);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      this.sortQueue();
      return removed;
    }
    return null;
  }

  clearQueue(): void {
    this.queue = [];
  }

  skipCurrentSong(): Song | null {
    const skipped = this.currentSong;
    if (this.queue.length > 0) {
      // Move the highest voted song to current song
      const nextSong = this.queue.shift();
      this.currentSong = nextSong || null;
      this.sortQueue();
    }
    else{
      this.currentSong = null;
    }
    return skipped;
  }

  toJSON(): RoomJSON {
    return {
      id: this.id,
      hostId: this.hostId,
      users: Array.from(this.users.values()),
      queue: this.queue.map(song => ({
        ...song,
        votedBy: Array.from(song.votedBy) // Convert Set to Array for JSON
      })),
      currentSong: this.currentSong ? {
        ...this.currentSong,
        votedBy: Array.from(this.currentSong.votedBy)
      } : null,
      createdAt: this.createdAt
    };
  }
}