import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { config } from './config';
import { SocketService } from './services/socket.service';
import { redisService } from './services/redis.service';
import { gameEngine } from './game/GameEngine';
import { signToken } from './utils/jwt';

const app = express();
const server = createServer(app);
const socketService = new SocketService(server);
// Set the singleton instance
const { socketServiceInstance } = require('./services/socket.service');
require('./services/socket.service').socketServiceInstance = socketService;

app.use(cors(config.cors));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/room/create', async (req, res) => {
  try {
    const { displayName, options } = req.body;

    if (!displayName || displayName.trim().length < 1) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    const room = gameEngine.createRoom(displayName, options);
    const playerId = Array.from(room.players.keys())[0];

    const token = signToken({ playerId, roomId: room.id, isMaster: true });

    await redisService.saveRoom(room);

    res.json({
      success: true,
      roomId: room.id,
      token,
      playerId,
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({ error: 'Failed to create room' });
  }
});

app.post('/api/room/join', async (req, res) => {
  try {
    const { roomId, displayName, avatar } = req.body;

    if (!roomId || !displayName) {
      return res.status(400).json({ error: 'Room ID and display name are required' });
    }

    let room = gameEngine.getRoom(roomId);

    if (!room) {
      room = await redisService.getRoom(roomId) || undefined;
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
    }

    const result = gameEngine.joinRoom(roomId, displayName, avatar);

    if (!result) {
      return res.status(400).json({ error: 'Cannot join room' });
    }

    const { playerId } = result;

    const token = signToken({ playerId, roomId: room.id, isMaster: false });

    await redisService.saveRoom(room);

    res.json({
      success: true,
      roomId: room.id,
      token,
      playerId,
    });
  } catch (error) {
    console.error('Error joining room:', error);
    return res.status(500).json({ error: 'Failed to join room' });
  }
});

app.get('/api/room/:roomId/status', async (req, res) => {
  try {
    const { roomId } = req.params;

    let room = gameEngine.getRoom(roomId);

    if (!room) {
      room = await redisService.getRoom(roomId) || undefined;
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
    }

    const players = Array.from(room.players.values()).map(p => ({
      id: p.id,
      displayName: p.displayName,
      isConnected: p.isConnected,
      isMaster: p.isMaster,
      avatar: p.avatar,
    }));

    res.json({
      id: room.id,
      state: room.state,
      players,
      options: room.options,
      playerCount: room.players.size,
      maxPlayers: room.options.maxPlayers,
    });
  } catch (error) {
    console.error('Error getting room status:', error);
    return res.status(500).json({ error: 'Failed to get room status' });
  }
});

app.get('/api/rooms', async (_req, res) => {
  try {
    const publicRooms = gameEngine.getAllPublicRooms();

    const rooms = publicRooms.map(room => ({
      id: room.id,
      playerCount: room.players.size,
      maxPlayers: room.options.maxPlayers,
      createdAt: room.createdAt,
    }));

    res.json({ rooms });
  } catch (error) {
    console.error('Error getting rooms:', error);
    return res.status(500).json({ error: 'Failed to get rooms' });
  }
});

app.post('/api/auth/guest', (req, res) => {
  const { displayName } = req.body;

  if (!displayName) {
    return res.status(400).json({ error: 'Display name is required' });
  }

  const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const token = signToken({ guestId, displayName, isGuest: true });

  res.json({ guestId, token, displayName });
});

async function startServer() {
  try {
    await redisService.connect();
    console.log('Connected to Redis');

    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.env}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await redisService.disconnect();
  server.close();
  process.exit(0);
});

startServer();