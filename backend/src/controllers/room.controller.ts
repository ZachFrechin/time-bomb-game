import { Request, Response } from 'express';
import { gameEngine } from '../game/GameEngine';
import { redisService } from '../services/redis.service';

export class RoomController {
    async createRoom(req: Request, res: Response) {
        try {
            const { displayName, options } = req.body;

            if (!displayName || displayName.trim().length < 1) {
                return res.status(400).json({ error: 'Display name is required' });
            }

            const room = gameEngine.createRoom(displayName, options);
            const playerId = Array.from(room.players.keys())[0];

            await redisService.saveRoom(room);

            res.json({
                success: true,
                roomId: room.id,
                playerId,
            });
        } catch (error) {
            console.error('Error creating room:', error);
            return res.status(500).json({ error: 'Failed to create room' });
        }
    }

    async joinRoom(req: Request, res: Response) {
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

            await redisService.saveRoom(room);

            res.json({
                success: true,
                roomId: room.id,
                playerId,
            });
        } catch (error) {
            console.error('Error joining room:', error);
            return res.status(500).json({ error: 'Failed to join room' });
        }
    }

    async getRoomStatus(req: Request, res: Response) {
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
    }

    async getAllRooms(_req: Request, res: Response) {
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
    }
}

export const roomController = new RoomController();