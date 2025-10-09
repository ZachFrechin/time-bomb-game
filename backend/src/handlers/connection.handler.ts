import { Socket } from 'socket.io';
import { gameEngine } from '../game/GameEngine';
import { redisService } from '../services/redis.service';
import { communicatorService } from '../services/communicator.service';
import { playerManager } from '../managers/player.manager';

export class ConnectionHandler {
    /**
     * Handle client disconnection
     */
    async handleDisconnect(socket: Socket): Promise<void> {
        console.log(`Client disconnected: ${socket.id}`);

        if (socket.data.roomId && socket.data.playerId) {
            const room = gameEngine.getRoom(socket.data.roomId);
            if (room) {
                const success = playerManager.disconnectPlayer(room, socket.data.playerId);

                if (success) {
                    await redisService.saveRoom(room);

                    communicatorService.broadcastPlayerDisconnected(
                        room,
                        socket.data.playerId
                    );
                }
            }
        }
    }

    /**
     * Handle client connection
     */
    handleConnection(socket: Socket): void {
        console.log(`Client connected: ${socket.id}`);
    }
}

export const connectionHandler = new ConnectionHandler();