import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { WebSocketHandler } from './WebSocketHandler.js';

// Create HTTP server
const server = createServer();

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Create WebSocket handler
const wsHandler = new WebSocketHandler();

// Handle WebSocket connections
wss.on('connection', (ws) => {
  wsHandler.handleConnection(ws);
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎵 Music Queue WebSocket Server running on port ${PORT}`);
  console.log(`📊 Server Stats:`);
  console.log(`   - Active rooms: ${wsHandler.getRoomsCount()}`);
  console.log(`   - Connected users: ${wsHandler.getUsersCount()}`);
});

// Cleanup and stats logging
setInterval(() => {
  console.log(`📊 Server Stats: ${wsHandler.getRoomsCount()} rooms, ${wsHandler.getUsersCount()} users`);
  wsHandler.cleanupEmptyRooms();
}, 30000); // Every 30 seconds

// Graceful shutdown
process.on('SIGINT', () => {
  wsHandler.shutdown();
  
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('🚀 Music Queue Backend Server Started!');
console.log('📝 Available WebSocket Events:');
console.log('   - create_room: Create a new room');
console.log('   - join_room: Join an existing room');
console.log('   - add_song: Add song to queue');
console.log('   - vote_song: Vote for a song');
console.log('   - skip_song: Skip current song (host only)');
console.log('   - clear_queue: Clear the queue (host only)');
console.log('   - get_room_state: Get current room state');