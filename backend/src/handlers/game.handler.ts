import { Socket } from 'socket.io';
import { gameEngine } from '../game/GameEngine';
import { redisService } from '../services/redis.service';
import { communicatorService } from '../services/communicator.service';
import { roomManager } from '../managers/room.manager';

export class GameHandler {
    /**
     * Handle starting a game
     */
    async handleStartGame(
        socket: Socket,
        data: { roomId: string }
    ): Promise<void> {
        try {
            const room = gameEngine.getRoom(data.roomId);
            if (!room) return;

            const success = gameEngine.startGame(data.roomId);

            if (success) {
                await redisService.saveRoom(room);
                communicatorService.broadcastGameStart(room);
            }
        } catch (error) {
            console.error('Error starting game:', error);
            socket.emit('error', { code: 'START_FAILED', message: 'Failed to start game' });
        }
    }

    /**
     * Handle cutting a wire
     */
    async handleCutWire(
        socket: Socket,
        data: { roomId: string; targetPlayerId: string; wireIndex: number }
    ): Promise<void> {
        console.log('Cut wire request:', data, 'Socket data:', socket.data);

        try {
            const room = gameEngine.getRoom(data.roomId);
            if (!room) {
                console.error('Room not found:', data.roomId);
                return;
            }

            const playerId = socket.data.playerId;
            if (!playerId) {
                console.error('No playerId in socket data');
                return;
            }

            const result = gameEngine.cutWire(
                data.roomId,
                playerId,
                data.targetPlayerId,
                data.wireIndex
            );

            if (result) {
                await redisService.saveRoom(room);

                // Broadcast result
                communicatorService.broadcastWireCutResult(room, result);
                communicatorService.broadcastPlayersUpdate(room);

                // Handle game over
                if (result.gameOver && result.winner) {
                    communicatorService.broadcastGameOver(room, result.winner);
                } else if (room.gameState) {
                    // Announce next turn
                    communicatorService.announcePlayerTurn(room);
                }
            }
        } catch (error) {
            console.error('Error cutting wire:', error);
            socket.emit('error', { code: 'CUT_FAILED', message: 'Failed to cut wire' });
        }
    }

    /**
     * Handle player declaration
     */
    async handleDeclareWires(
        socket: Socket,
        data: { safeWires: number; hasBomb: boolean },
        callback?: any
    ): Promise<void> {
        try {
            if (!socket.data.roomId || !socket.data.playerId) {
                if (callback) callback({ success: false, error: 'No room or player data' });
                return;
            }

            const success = gameEngine.declareWires(
                socket.data.roomId,
                socket.data.playerId,
                data
            );

            if (success) {
                const room = gameEngine.getRoom(socket.data.roomId);
                if (room) {
                    await redisService.saveRoom(room);
                    communicatorService.broadcastPlayerDeclaration(
                        socket.data.roomId,
                        socket.data.playerId,
                        data
                    );
                }
            }

            if (callback) {
                callback({ success });
            }
        } catch (error) {
            console.error('Error declaring wires:', error);
            if (callback) {
                callback({ success: false, error: 'Failed to declare wires' });
            }
        }
    }
}

export const gameHandler = new GameHandler();