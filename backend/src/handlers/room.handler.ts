import { Socket } from 'socket.io';
import { gameEngine } from '../game/GameEngine';
import { redisService } from '../services/redis.service';
import { communicatorService } from '../services/communicator.service';
import { roomManager } from '../managers/room.manager';
import { playerManager } from '../managers/player.manager';

export class RoomHandler {
    /**
     * Handle room creation
     */
    async handleCreateRoom(
        socket: Socket,
        data: { displayName: string; options?: any },
        callback?: any
    ): Promise<void> {
        try {
            const room = gameEngine.createRoom(data.displayName, data.options);
            const playerId = Array.from(room.players.keys())[0];
            const player = room.players.get(playerId)!;
            player.socketId = socket.id;

            // Join socket room
            socket.join(room.id);
            socket.data.playerId = playerId;
            socket.data.roomId = room.id;
            socket.data.displayName = data.displayName;

            // Save to Redis
            await redisService.saveRoom(room);
            await redisService.savePlayerSession(playerId, {
                roomId: room.id,
                displayName: data.displayName,
            });

            if (callback) {
                callback({ success: true, roomId: room.id, playerId });
            }

            // Broadcast lobby update
            communicatorService.broadcastLobbyUpdate(room);
        } catch (error) {
            console.error('Error creating room:', error);
            if (callback) {
                callback({ success: false, error: 'Failed to create room' });
            }
        }
    }

    /**
     * Handle joining a room
     */
    async handleJoinRoom(
        socket: Socket,
        data: { roomId: string; displayName?: string; playerName?: string; playerId?: string; avatar?: string },
        callback?: any
    ): Promise<void> {
        try {
            let room = gameEngine.getRoom(data.roomId);

            // Try to load from Redis if not in memory
            if (!room) {
                room = await redisService.getRoom(data.roomId) || undefined;
                if (!room) {
                    if (callback) {
                        callback({ success: false, error: 'Room not found' });
                    }
                    return;
                }
            }

            let playerId: string;
            let isReconnection = false;

            // Check for reconnection
            if (data.playerId && room.players.has(data.playerId)) {
                playerId = data.playerId;
                const player = room.players.get(playerId)!;
                playerManager.reconnectPlayer(room, playerId, socket.id);
                isReconnection = true;
                console.log(`Player ${player.displayName} reconnected to room ${room.id}`);
            } else {
                // New player joining
                const displayName = data.displayName || data.playerName || 'Player';
                const result = gameEngine.joinRoom(data.roomId, displayName, data.avatar);

                if (!result) {
                    if (callback) {
                        callback({ success: false, error: 'Cannot join room' });
                    }
                    return;
                }

                playerId = result.playerId;
                const player = room.players.get(playerId)!;
                player.socketId = socket.id;
            }

            // Join socket room
            socket.join(room.id);
            socket.data.playerId = playerId;
            socket.data.roomId = room.id;
            socket.data.displayName = room.players.get(playerId)?.displayName;

            // Save to Redis
            await redisService.saveRoom(room);
            await redisService.savePlayerSession(playerId, {
                roomId: room.id,
                displayName: socket.data.displayName || '',
            });

            if (callback) {
                callback({ success: true, roomId: room.id, playerId });
            }

            // Handle reconnection vs new join
            if (isReconnection) {
                communicatorService.sendReconnectionData(socket, room, playerId);
            } else {
                communicatorService.notifyRoomJoined(room.id, playerId);
            }

            // Update lobby if in lobby state
            if (room.state === 'lobby') {
                communicatorService.broadcastLobbyUpdate(room);
            }
        } catch (error) {
            console.error('Error joining room:', error);
            if (callback) {
                callback({ success: false, error: 'Failed to join room' });
            }
        }
    }

    /**
     * Handle leaving a room
     */
    async handleLeaveRoom(
        socket: Socket,
        data: { roomId: string }
    ): Promise<void> {
        try {
            const room = gameEngine.getRoom(data.roomId);
            if (room && socket.data.playerId) {
                playerManager.removePlayerFromRoom(room, socket.data.playerId);
                socket.leave(data.roomId);

                if (playerManager.getPlayerCount(room) === 0) {
                    gameEngine.removeRoom(data.roomId);
                    await redisService.deleteRoom(data.roomId);
                } else {
                    await redisService.saveRoom(room);
                    communicatorService.broadcastLobbyUpdate(room);
                }
            }
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    }

    /**
     * Handle kicking a player
     */
    async handleKickPlayer(
        socket: Socket,
        data: { roomId: string; playerId: string }
    ): Promise<void> {
        try {
            const requesterId = socket.data.playerId;
            if (!requesterId) return;

            const success = gameEngine.kickPlayer(data.roomId, data.playerId, requesterId);

            if (success) {
                const room = gameEngine.getRoom(data.roomId);
                if (room) {
                    await redisService.saveRoom(room);

                    // Find target socket
                    const io = communicatorService['io'];
                    if (io) {
                        const targetSocket = Array.from(io.sockets.sockets.values())
                            .find(s => s.data.playerId === data.playerId);

                        if (targetSocket) {
                            targetSocket.leave(data.roomId);
                            communicatorService.notifyPlayerKicked(
                                targetSocket,
                                data.playerId,
                                targetSocket.data.displayName || ''
                            );
                        }
                    }

                    communicatorService.broadcastLobbyUpdate(room);
                }
            }
        } catch (error) {
            console.error('Error kicking player:', error);
        }
    }
}

export const roomHandler = new RoomHandler();