import { Socket } from 'socket.io';
import { communicatorService } from '../services/communicator.service';

export class ChatHandler {
    /**
     * Handle sending a chat message
     */
    handleSendChat(
        socket: Socket,
        data: { roomId: string; message: string }
    ): void {
        if (!socket.data.roomId || socket.data.roomId !== data.roomId) {
            return;
        }

        communicatorService.broadcastChatMessage(
            data.roomId,
            socket.data.playerId || '',
            socket.data.displayName || 'Unknown',
            data.message
        );
    }
}

export const chatHandler = new ChatHandler();